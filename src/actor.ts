import {
    MODULE,
    addListener,
    changeCarryType,
    createHTMLElement,
    elementDataset,
    getHighestSpellcastingStatistic,
    getSetting,
    htmlQuery,
    itemIsOfType,
    libWrapper,
    localize,
    render,
    getSpellClass,
    templateLocalize,
    getSpellCollectionClass,
    getFlag,
} from "foundry-pf2e";
import {
    canPrepareDailies,
    getActorFlag,
    getStaffFlags,
    isTemporary,
    openDailiesInterface,
    setStaffChargesValue,
} from "./api";
import { StaffSpellcasting } from "./data/staves";

async function performDailyCrafting(this: CharacterPF2e) {
    const entries = (await this.getCraftingEntries()).filter((e) => e.isDailyPrep);
    const alchemicalEntries = entries.filter((e) => e.isAlchemical);
    const reagentCost = alchemicalEntries.reduce((sum, entry) => sum + entry.reagentCost, 0);
    const reagentValue = (this.system.resources.crafting.infusedReagents.value || 0) - reagentCost;
    if (reagentValue < 0) {
        ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
        return;
    } else {
        await this.update({ "system.resources.crafting.infusedReagents.value": reagentValue });
        const key =
            reagentCost === 0 ? "ZeroConsumed" : reagentCost === 1 ? "OneConsumed" : "NConsumed";
        ui.notifications.info(
            game.i18n.format(`PF2E.Actor.Character.Crafting.Daily.Complete.${key}`, {
                quantity: reagentCost,
            })
        );
    }

    // Remove infused/temp items
    // for (const item of this.inventory) {
    //     if (item.system.temporary) await item.delete();
    // }

    for (const entry of entries) {
        for (const formula of entry.preparedCraftingFormulas) {
            const itemSource: PhysicalItemSource = formula.item.toObject();
            itemSource.system.quantity = formula.quantity;
            itemSource.system.temporary = true;
            itemSource.system.size = this.ancestry?.size === "tiny" ? "tiny" : "med";

            if (
                entry.isAlchemical &&
                itemIsOfType(itemSource, "consumable", "equipment", "weapon")
            ) {
                itemSource.system.traits.value.push("infused");
            }
            await this.addToInventory(itemSource);
        }
    }
}

async function renderChargesEntries(
    actor: CharacterPF2e | NPCPF2e,
    parentElement: HTMLElement,
    callback?: (
        entryContainer: HTMLElement,
        chargesElement: HTMLElement,
        toggleElement: HTMLElement
    ) => void
) {
    const chargesEntries = actor.spellcasting.regular.filter(
        (entry) => entry.system.prepared.value === "charges"
    );

    for (const entry of chargesEntries) {
        const entryContainer = htmlQuery(parentElement, `[data-container-id="${entry.id}"]`);
        if (!entryContainer) continue;

        const charges = entry.system.slots.slot1;
        const chargesElement = await createChargesElement(actor, charges, true);

        addListener(
            chargesElement,
            "[data-action='change-charges']",
            "change",
            (event, el: HTMLInputElement) => {
                const value = Math.clamp(el.valueAsNumber, 0, charges.max);
                entry.update({ "system.slots.slot1.value": value });
            }
        );

        addListener(
            chargesElement,
            "[data-action='change-max-charges']",
            "change",
            (event, el: HTMLInputElement) => {
                const value = Math.clamp(el.valueAsNumber, 0, 50);
                entry.update({
                    "system.slots.slot1.max": value,
                    "system.slots.slot1.value": Math.min(value, charges.value),
                });
            }
        );

        addListener(chargesElement, "[data-action='reset-charges']", async () => {
            entry.update({ "system.slots.slot1.value": charges.max });
        });

        const classStr = entry.showSlotlessRanks ? "fa-solid" : "fa-regular";
        const toggleElement = createHTMLElement("a", {
            innerHTML: `<i class="${classStr} fa-fw fa-list-alt"></i>`,
            dataset: {
                action: "toggle-show-slotless-ranks",
                tooltip: "PF2E.ToggleSlotlessSpellLevelsTitle",
            },
        });

        callback?.(entryContainer, chargesElement, toggleElement);
    }
}

function onRenderNPCSheetPF2e(sheet: NPCSheetPF2e, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];
    const spellsTab = htmlQuery(html, ".tab[data-tab='spells']");
    if (!spellsTab) return;

    renderChargesEntries(actor, spellsTab, (container, charges, toggle) => {
        htmlQuery(container, ":scope > .header")?.after(charges);
        if (actor.isOwner) {
            htmlQuery(container, ":scope > .header > .item-controls")?.prepend(toggle);
        }
    });
}

async function onRenderCharacterSheetPF2e(sheet: CharacterSheetPF2e, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];
    const contentElement = htmlQuery(html, ".sheet-content");
    if (!contentElement) return;

    const spellsTab = htmlQuery(contentElement, ".tab[data-tab='spellcasting']");
    const highlightItems = getSetting("addedHighlight");

    if (actor.isOwner) {
        const targetEl = htmlQuery(html, "aside .sidebar .hitpoints .hp-small");

        if (targetEl) {
            const canPrep = canPrepareDailies(actor);

            const classes = ["roll-icon", "dailies"];
            if (!canPrep) classes.push("disabled");

            const dailyIcon = createHTMLElement("a", {
                innerHTML: "<i class='fas fa-mug-saucer'></i>",
                classes,
                dataset: {
                    action: "prepare-dailies",
                    tooltip: canPrep
                        ? localize("sheet.title")
                        : getFlag(actor, "tooltip") || localize("sheet.unrested"),
                    tooltipClass: canPrep ? "pf2e" : "pf2e pf2e-dailies-summary",
                },
            });

            targetEl.appendChild(dailyIcon);

            if (canPrep) {
                dailyIcon.addEventListener("click", () => {
                    openDailiesInterface(actor);
                });
            }
        }
    }

    if (spellsTab) {
        renderChargesEntries(actor, spellsTab, (container, charges, toggle) => {
            htmlQuery(container, ".spell-ability-data .statistic-values")?.after(charges);
            if (actor.isOwner) {
                htmlQuery(container, ".action-header .item-controls")?.prepend(toggle);
            }
        });
    }

    {
        const staffData = getStaffFlags(actor);
        const staff = staffData ? actor.inventory.get(staffData.staffId) : undefined;
        const staffId = staffData?.staffId;
        const staffContainer = staffId
            ? htmlQuery(contentElement, `[data-container-id="${staffId}-casting"]`)
            : undefined;

        if (staffContainer && staffData && staff) {
            const rowControls = staffContainer.querySelectorAll(".item-controls");
            const handles = staffContainer.querySelectorAll<HTMLElement>(".item-name");

            if (highlightItems) {
                staffContainer.classList.add("temporary");
            }

            for (const controls of rowControls ?? []) {
                controls.innerHTML = "";
            }

            for (const handle of handles ?? []) {
                handle.classList.remove("drag-handle");
                handle.draggable = false;
                delete handle.dataset.dragHandle;
            }

            const charges = staffData.charges;
            const isEquipped = staff.isEquipped;
            const annotation = isEquipped
                ? "sheathe"
                : staff.carryType === "dropped"
                ? "pick-up"
                : staff.isStowed
                ? "retrieve"
                : "draw";
            const action = isEquipped
                ? undefined
                : {
                      cost: annotation === "retrieve" ? 2 : 1,
                      id: staff.id,
                      label: localize("staves.action", annotation),
                  };
            const chargesElement = await createChargesElement(actor, charges, false, action);

            addListener(
                chargesElement,
                "[data-action='change-charges']",
                "change",
                (event, el: HTMLInputElement) => {
                    const value = Math.clamp(el.valueAsNumber, 0, charges.max);
                    setStaffChargesValue(actor, value);
                }
            );

            addListener(chargesElement, "[data-action='reset-charges']", async () => {
                setStaffChargesValue(actor, charges.max);
            });

            if (!isEquipped) {
                addListener(chargesElement, "button", () => {
                    changeCarryType(actor, staff, annotation === "sheathe" ? 0 : 1, annotation);
                });
            }

            htmlQuery(staffContainer, ".spell-ability-data .statistic-values")?.after(
                chargesElement
            );
        }
    }

    {
        const addedItems = getActorFlag(actor, "addedItems");

        if (highlightItems) {
            for (const id of addedItems ?? []) {
                const itemElements = contentElement.querySelectorAll(`[data-item-id="${id}"]`);

                for (const itemElement of itemElements) {
                    itemElement.classList.add(`temporary`);
                }
            }
        }
    }
}

async function createChargesElement(
    actor: ActorPF2e,
    charges: { value: number; max: number },
    withMax: boolean,
    action?: { label: string; cost: number; id: string }
) {
    const isOwner = actor.isOwner;
    const chargesTemplate = await render("charges", {
        isOwner,
        charges,
        withMax,
        action,
        i18n: templateLocalize("sheet.charges"),
    });

    return createHTMLElement("div", {
        classes: ["pf2e-dailies-charges"],
        innerHTML: chargesTemplate,
    });
}

function onRenderFamiliarSheetPF2e(sheet: FamiliarSheetPF2e, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];
    const itemElements = html.querySelectorAll<HTMLElement>(
        ".section-container:not(.familiar-section) .actions-list [data-item-id]"
    );

    for (const itemElement of itemElements) {
        const { itemId } = elementDataset(itemElement);
        const item = actor.items.get(itemId);

        if (item && isTemporary(item)) {
            itemElement.classList.add("temporary");
        }
    }
}

async function onCharacterSheetGetData(
    this: CharacterSheetPF2e,
    wrapped: libWrapper.RegisterCallback,
    options?: ActorSheetOptions
) {
    const data = (await wrapped(options)) as CharacterSheetData;

    try {
        const actor = this.actor;
        const staffId = getStaffFlags(actor)?.staffId;
        if (!staffId) return data;

        const staff = actor.inventory.get(staffId);
        if (!staff) return data;

        const collectionId = `${staff.id}-casting`;
        const knownCollections = data.spellCollectionGroups["known-spells"];

        const collectionIndex = knownCollections.findIndex((group) => group.id === collectionId);
        if (collectionIndex === -1) return data;

        const collectionGroup = knownCollections.splice(collectionIndex, 1)[0];
        data.spellCollectionGroups.activations.unshift(collectionGroup);
    } catch (error) {
        MODULE.error("CharacterSheetPF2e#getData", error);
    }

    return data;
}

function onCharacterPrepareData(this: CharacterPF2e, wrapped: libWrapper.RegisterCallback): void {
    wrapped();

    try {
        const staffFlags = getStaffFlags(this);
        if (!staffFlags) return;

        const staff = this.items.get<dailies.StaffPF2e>(staffFlags.staffId);
        if (!staff) return;

        const staffStatistic = (() => {
            if (staffFlags.statistic) {
                const statistic = this.getStatistic(staffFlags.statistic.slug);
                return statistic
                    ? {
                          statistic,
                          tradition: staffFlags.statistic.tradition,
                      }
                    : undefined;
            }
            return getHighestSpellcastingStatistic(this);
        })();

        if (!staffStatistic) return;

        const collectionId = `${staff.id}-casting`;
        const staffEntry = new StaffSpellcasting(
            {
                ...staffStatistic,
                id: collectionId,
                name: staff.name,
                actor: this,
                castPredicate: [
                    `item:id:${staff.id}`,
                    { or: staffFlags.spells.map((s) => `spell:id:${s._id}`) },
                ],
            },
            staff
        );

        class StaffSpell extends getSpellClass()<CharacterPF2e> {
            override async toMessage(
                event?: Maybe<MouseEvent | JQuery.TriggeredEvent>,
                { create = true, data, rollMode }: SpellToMessageOptions = {}
            ): Promise<ChatMessagePF2e | undefined> {
                const message = await super.toMessage(event, { rollMode, data, create: false });
                if (!message) return undefined;

                const messageSource = message.toObject();
                const flags = messageSource.flags.pf2e;

                flags.casting!.embeddedSpell = this.toObject();

                if (!create) {
                    message.updateSource(messageSource);
                    return message;
                }

                return getDocumentClass("ChatMessage").create(messageSource, {
                    renderSheet: false,
                });
            }
        }

        const SpellCollection = getSpellCollectionClass(this);
        const collection = new SpellCollection(staffEntry);

        for (const spellSource of staffFlags.spells) {
            const source: SpellSource = foundry.utils.mergeObject(
                spellSource,
                { "system.location.value": collectionId },
                { inplace: false }
            );

            const spell = new StaffSpell(source, { parent: this });
            collection.set(spell.id, spell);
        }

        this.spellcasting.set(staffEntry.id, staffEntry);
        this.spellcasting.collections.set(collectionId, collection);
    } catch (error) {
        MODULE.error("CharacterPF2e#prepareData", error);
    }
}

export {
    onCharacterPrepareData,
    onCharacterSheetGetData,
    onRenderCharacterSheetPF2e,
    onRenderFamiliarSheetPF2e,
    onRenderNPCSheetPF2e,
    performDailyCrafting,
};
