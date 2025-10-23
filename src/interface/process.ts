import { DailyActorFlags } from "actor";
import { PreparedDaily } from "dailies";
import {
    DailyMessageOptions,
    DailyProcessOptions,
    DailyRowData,
    DailyRowType,
    DailyRuleElement,
} from "daily";
import {
    CharacterPF2e,
    createChatLink,
    createSpellcastingWithHighestStatisticSource,
    error,
    FeatPF2e,
    FeatSource,
    getFlag,
    getFlagProperty,
    htmlClosest,
    htmlQuery,
    ItemPF2e,
    ItemSourcePF2e,
    localize,
    localizeIfExist,
    MODULE,
    OneToTen,
    R,
    setFlagProperty,
    SpellPF2e,
} from "module-helpers";
import { createUpdateCollection, utils } from "utils";
import { DailyInterface } from ".";
import fu = foundry.utils;

async function processDailies(this: DailyInterface) {
    const rowElements = this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "[data-daily]"
    );

    const flags: Record<string, Record<string, DailyRowData>> = {};
    const extraFlags: Record<string, any> = {};
    const dailies: Record<
        string,
        {
            daily: PreparedDaily;
            rows: Record<string, DailyRowData>;
        }
    > = {};

    for (const rowElement of rowElements) {
        let row: DailyRowData;

        if (rowElementIsOFType(rowElement, "drop")) {
            row = {
                uuid: rowElement.dataset.uuid,
                name: rowElement.value,
            };
        } else if (rowElementIsOFType(rowElement, "combo")) {
            const isInput = rowElement.dataset.input === "true";
            const selected = isInput
                ? rowElement.value.trim()
                : htmlQuery(htmlClosest(rowElement, ".combo"), "select")?.value ?? "";

            row = {
                selected,
                input: isInput,
            };
        } else if (rowElementIsOFType(rowElement, "select", "input")) {
            row = rowElement.value.trim();
        } else if (rowElementIsOFType(rowElement, "random")) {
            row = utils.selectRandomOption(rowElement);
        } else if (rowElementIsOFType(rowElement, "notify")) {
            row = true;
        } else {
            continue;
        }

        const data = rowElement.dataset as RowElementDatasetBase;

        dailies[data.daily] ??= {
            daily: this.dailies[data.daily]!,
            rows: {},
        };

        dailies[data.daily].rows[data.row] = row;

        if (data.save === "true") {
            flags[data.daily] ??= {};
            flags[data.daily][data.row] = row;
        }
    }

    const actor = this.actor;
    const deletedItems: string[] = [];
    const addedItems: (PreCreate<ItemSourcePF2e> | ItemSourcePF2e)[] = [];
    const flaggedItems: Record<string, string[]> = {};
    const itemsRules = new Map<string, DailyRuleElement[]>();
    const [updatedItems, updateItem] = createUpdateCollection();
    const rawMessages: { message: string; order: number }[] = [];
    const addedItemIds: string[] = [];
    const temporaryDeleted: Record<string, ItemSourcePF2e> = {};

    const messageGroups: Record<string, DailyMessageGroup> = {
        languages: { order: 80, messages: [] },
        skills: { order: 70, messages: [] },
        resistances: { order: 60, messages: [] },
        feats: { order: 50, messages: [] },
        spells: { order: 40, messages: [] },
        scrolls: { order: 30, messages: [] },
    };

    const addItemToActor = (
        source: PreCreate<ItemSourcePF2e> | ItemSourcePF2e,
        temporary = true
    ) => {
        if (temporary) {
            setFlagProperty(source, "temporary", true);
        }

        addedItems.push(source);
    };

    const getRules = (item: ItemPF2e) => {
        const id = item.id;
        const existing = itemsRules.get(id);

        if (existing) {
            return existing;
        }

        const rules = fu.deepClone(item._source.system.rules);

        for (let i = rules.length - 1; i >= 0; i--) {
            if (MODULE.id in rules[i]) {
                rules.splice(i, 1);
            }
        }

        itemsRules.set(id, rules);
        return rules;
    };

    const processOptions = (
        daily: PreparedDaily,
        rows: Record<string, DailyRowData>
    ): Omit<DailyProcessOptions, "addItem" | "addFeat" | "addRule"> => {
        const items = daily.prepared.items;
        const custom = daily.prepared.custom;

        return {
            actor,
            items,
            custom,
            // @ts-ignore
            rows,
            messages: {
                add: (group, message) => {
                    messageGroups[group] ??= { order: 0, messages: [] };
                    messageGroups[group].messages.push(message);
                },
                addGroup: (name, label, order = 0) => {
                    if (name in messageGroups) {
                        messageGroups[name].label ??= label;
                        messageGroups[name].order ??= order;
                    } else {
                        messageGroups[name] = {
                            label,
                            order,
                            messages: [],
                        };
                    }
                },
                addRaw: (message, order: number = 1) => {
                    rawMessages.push({ message, order });
                },
            },
            updateItem,
            flagItem: (item, label) => {
                if (item.actor !== actor) return;

                const flags = (flaggedItems[item.id] ??= []);
                flags.push(label?.trim() || (daily.label as string));
            },
            deleteItem: (item, temporary = false) => {
                if (temporary) {
                    temporaryDeleted[item.id] = item.toObject();
                }

                deletedItems.push(item.id);
            },
            removeRule: (item: ItemPF2e, signature: (rule: DailyRuleElement) => boolean) => {
                const rules = getRules(item);

                for (let i = rules.length - 1; i >= 0; i--) {
                    const rule = rules[i];

                    if (signature(rule)) {
                        rules.splice(i, 1);
                    }
                }
            },
            setExtraFlags: (data: Record<string, any>) => {
                fu.mergeObject((extraFlags[daily.key] ??= {}), data);
            },
        };
    };

    await Promise.all(
        Object.values(dailies).map(({ daily, rows }) => {
            const addItem = (
                source: PreCreate<ItemSourcePF2e> | ItemSourcePF2e,
                temporary?: boolean
            ) => {
                setFlagProperty(source, "daily", daily.key);
                addItemToActor(source, temporary);
            };

            const addFeat = (
                source: PreCreate<FeatSource> | FeatSource,
                parent?: ItemPF2e | null,
                temporary = true
            ) => {
                if (parent?.isOfType("feat")) {
                    const parentId = parent.id;
                    fu.setProperty(source, "flags.pf2e.grantedBy", {
                        id: parentId,
                        onDelete: "cascade",
                    });
                    setFlagProperty(source, "grantedBy", parentId);
                }
                addItem(source, temporary);
            };

            try {
                const globalOptions = processOptions(daily, rows);
                const options = R.merge(globalOptions, {
                    addItem,
                    addFeat,
                    addRule: (item: ItemPF2e, source: DailyRuleElement) => {
                        source[MODULE.id] = daily.key;
                        getRules(item).push(source);
                    },
                    replaceFeat: (
                        original: FeatPF2e,
                        source: PreCreate<FeatSource> | FeatSource
                    ) => {
                        fu.setProperty(source, "system.location", original.system.location);
                        fu.setProperty(source, "system.level.taken", original.system.level.taken);

                        addFeat(source, original.grantedBy, false);
                        globalOptions.deleteItem(original);
                    },
                });

                return daily.process(options);
            } catch (err) {
                error("error.unexpected");
                console.error(err);
                console.error(`The error occured during processing of ${daily.key}`);
            }
        })
    );

    let hasOrphanSpells = false;
    const entryIdentifier = fu.randomID();

    for (const source of addedItems) {
        if (
            source.type === "spell" &&
            !fu.getProperty(source, "system.location.value") &&
            !getFlagProperty(source, "identifier")
        ) {
            hasOrphanSpells = true;
            setFlagProperty(source, "identifier", entryIdentifier);
        }
    }

    if (hasOrphanSpells) {
        const source = createSpellcastingWithHighestStatisticSource(actor, {
            name: localize("spellEntry.name"),
        });

        if (source) {
            setFlagProperty(source, "temporary", true);
            setFlagProperty(source, "identifier", entryIdentifier);
            addedItems.push(source);
        }
    }

    const currentFocus = actor.system.resources.focus;
    const currentMaxFocus = Math.clamp(currentFocus.max, 0, currentFocus.cap);

    let hasFocusSpells = currentMaxFocus;

    const actualAddedItems = addedItems.length
        ? await actor.createEmbeddedDocuments("Item", addedItems)
        : [];

    if (actualAddedItems.length) {
        for (const item of actualAddedItems) {
            if (getFlag(item, "temporary")) {
                addedItemIds.push(item.id);
            }
        }

        for (const item of actualAddedItems) {
            if (item.isOfType("feat")) {
                const parentId = getFlag<string>(item, "grantedBy");

                if (parentId) {
                    const slug = game.pf2e.system.sluggify(item.name, { camel: "dromedary" });
                    const path = `flags.pf2e.itemGrants.${slug}`;

                    updateItem({
                        _id: parentId,
                        [path]: { id: item.id, onDelete: "detach" },
                    });
                }
            } else if (item.isOfType("spellcastingEntry")) {
                const identifier = getFlag(item, "identifier");
                if (!identifier) continue;

                const spells = actualAddedItems.filter(
                    (spell): spell is SpellPF2e<CharacterPF2e> =>
                        spell.isOfType("spell") && getFlag(spell, "identifier") === identifier
                );

                for (const spell of spells) {
                    const rank = getFlag<OneToTen>(spell, "rank");
                    const update: EmbeddedDocumentUpdateData = {
                        _id: spell.id,
                        "system.location.value": item.id,
                        "system.location.heightenedLevel": rank,
                    };

                    if (getFlag(spell, "signature")) {
                        update["system.location.signature"] = true;
                    }

                    updateItem(update);
                }
            } else if (
                hasFocusSpells < currentFocus.cap &&
                item.isOfType("spell") &&
                item.system.traits.value.includes("focus")
            ) {
                hasFocusSpells += 1;
            }
        }

        await Promise.all(
            Object.values(dailies).map(({ daily, rows }) => {
                if (!R.isFunction(daily.afterItemAdded)) return;

                try {
                    const options = R.merge(processOptions(daily, rows), {
                        addedItems: actualAddedItems.filter(
                            (item) => getFlag(item, "daily") === daily.key
                        ),
                    });

                    return daily.afterItemAdded(options);
                } catch (err) {
                    error("error.unexpected");
                    console.error(err);
                    console.error(`The error occured during processing of ${daily.key}`);
                }
            })
        );
    }

    for (const [_id, rules] of itemsRules) {
        updateItem({ _id, "system.rules": rules });
    }

    if (updatedItems.size) {
        await actor.updateEmbeddedDocuments("Item", updatedItems.contents);
    }

    if (deletedItems.length) {
        await actor.deleteEmbeddedDocuments("Item", deletedItems);
    }

    const messages = Object.entries(messageGroups);
    const chatGroups = rawMessages.map(({ message, order }) => ({
        message: `<p>${message}</p>`,
        order,
    }));

    for (const [type, group] of messages) {
        if (!group.messages.length) continue;

        const groupLabel = group.label
            ? game.i18n.localize(group.label)
            : localizeIfExist("message.groups", type) ?? localize("message.gained", { type });

        let message = `<p><strong>${groupLabel}</strong></p>`;

        for (const messageOptions of group.messages) {
            message += "<p>";

            const label = messageOptions.label?.trim();

            if ("sourceId" in messageOptions && messageOptions.sourceId) {
                const item = actualAddedItems.find((x) => x.sourceId === messageOptions.sourceId);
                message += createChatLink(item?.uuid ?? messageOptions.sourceId, { label });
            } else if ("uuid" in messageOptions && messageOptions.uuid) {
                message += createChatLink(messageOptions.uuid, { label });
            } else if (label) {
                message += ` ${label}`;
            }

            if (messageOptions.selected) {
                message += `<i class="fa-solid fa-caret-right"></i>${messageOptions.selected}`;
            }

            if (messageOptions.random) {
                message += '<i class="fa-solid fa-dice-d20"></i>';
            }

            message += "</p>";
        }

        chatGroups.push({ message, order: group.order });
    }

    const preface = localize(chatGroups.length ? "message.changes" : "message.noChanges");

    chatGroups.unshift({ message: preface, order: Infinity });
    chatGroups.sort((a, b) => b.order - a.order);

    const ChatMessagePF2e = getDocumentClass("ChatMessage");
    const chatContent = chatGroups.map((group) => group.message).join("<hr />");

    await ChatMessagePF2e.create({
        content: `<div class="pf2e-dailies-summary">${chatContent}</div>`,
        speaker: ChatMessagePF2e.getSpeaker({ actor }),
    });

    const actorUpdates: Record<string, any> = {};

    if (currentMaxFocus !== hasFocusSpells) {
        const newMaxValue = Math.min(hasFocusSpells, currentFocus.cap);
        const newValue = currentFocus.value + (newMaxValue - currentMaxFocus);

        actorUpdates["system.resources.focus.max"] = newMaxValue;

        if (newValue !== currentFocus.value) {
            actorUpdates["system.resources.focus.value"] = newValue;
        }
    }

    setFlagProperty(actorUpdates, {
        ...flags,
        extra: extraFlags,
        rested: false,
        addedItems: addedItemIds,
        flaggedItems,
        temporaryDeleted,
        tooltip: await foundry.applications.ux.TextEditor.implementation.enrichHTML(chatContent),
    } satisfies DailyActorFlags);

    await actor.update(actorUpdates);
}

function rowElementIsOFType<T extends DailyRowType>(
    el: HTMLSelectElement | HTMLInputElement,
    ...types: T[]
): el is RowElementTypes[T] {
    return types.some((type) => el.dataset.type === type);
}

type DailyMessageGroup = {
    order: number;
    label?: string;
    messages: DailyMessageOptions[];
};

type RowElementDatasetBase = {
    daily: string;
    row: string;
    save: `${boolean}`;
};

type RowElementTypes = {
    select: HTMLSelectElement & { dataset: RowElementDatasetBase };
    random: HTMLSelectElement & { dataset: RowElementDatasetBase };
    combo: HTMLInputElement & { dataset: RowElementDatasetBase & { input: `${boolean}` } };
    alert: HTMLInputElement & { dataset: RowElementDatasetBase };
    input: HTMLInputElement & { dataset: RowElementDatasetBase };
    notify: HTMLInputElement & { dataset: RowElementDatasetBase };
    drop: HTMLInputElement & { dataset: RowElementDatasetBase & { uuid: string } };
};

export { processDailies };
