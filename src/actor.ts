import {
    ActorInventory,
    ActorPF2e,
    addListener,
    calculateCreatureDC,
    changeCarryType,
    CharacterPF2e,
    CharacterSheetData,
    CharacterSheetPF2e,
    ChatMessagePF2e,
    createHTMLElement,
    createSpellcastingSource,
    elementDataset,
    FamiliarPF2e,
    FamiliarSheetPF2e,
    getActorMaxRank,
    getHighestSpellcastingStatistic,
    getSetting,
    getSpellClass,
    getSpellCollectionClass,
    htmlQuery,
    info,
    localize,
    MODULE,
    NPCPF2e,
    NPCSheetPF2e,
    PhysicalItemPF2e,
    render,
    SpellcastingEntry,
    SpellcastingEntryPF2eWithCharges,
    SpellSource,
    SpellToMessageOptions,
    templateLocalize,
    wrapperError,
} from "module-helpers";
import {
    canPrepareDailies,
    getActorFlag,
    getAnimistVesselsData,
    getDailiesSummary,
    getStaffFlags,
    isTemporary,
    openDailiesInterface,
    setStaffChargesValue,
    toggleAnimistVesselPrimary,
} from "./api";
import { ActorStaff, getSpells, getStaves, StaffSpellcasting } from "./data/staves";

const ACTOR_PREPARE_EMBEDDED_DOCUMENTS =
    "CONFIG.Actor.documentClass.prototype.prepareEmbeddedDocuments";

function onActorPrepareEmbeddedDocuments<TActor extends CharacterPF2e = CharacterPF2e>(
    this: TActor,
    wrapped: libWrapper.RegisterCallback
): void {
    wrapped();

    try {
        Object.defineProperty(this.inventory, "deleteTemporaryItems", {
            value: async function (
                this: ActorInventory<TActor>,
                operation?: Partial<DatabaseDeleteOperation<TActor>>
            ): Promise<PhysicalItemPF2e<TActor>[]> {
                const actor = this.actor;
                const specialResourceItems = Object.values(actor.synthetics.resources)
                    .map((r) => r.itemUUID)
                    .filter((i) => !!i);
                const itemsToDelete = this.actor.inventory
                    .filter(
                        (i) =>
                            i.system.temporary &&
                            !isTemporary(i as PhysicalItemPF2e) &&
                            (!i.sourceId || !specialResourceItems.includes(i.sourceId))
                    )
                    .map((i) => i.id);

                if (itemsToDelete.length) {
                    const deletedItems = await actor.deleteEmbeddedDocuments(
                        "Item",
                        itemsToDelete,
                        operation
                    );
                    return deletedItems as PhysicalItemPF2e<TActor>[];
                }

                return [];
            },
        });
    } catch (error) {
        wrapperError(ACTOR_PREPARE_EMBEDDED_DOCUMENTS, error);
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
    const entries = actor.spellcasting.regular as SpellcastingEntryPF2eWithCharges[];
    const chargesEntries = entries.filter((entry) => entry.system.prepared.value === "charges");

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
    if (spellsTab) {
        renderChargesEntries(actor, spellsTab, (container, charges, toggle) => {
            htmlQuery(container, ":scope > .header")?.after(charges);
            if (actor.isOwner) {
                htmlQuery(container, ":scope > .header > .item-controls")?.prepend(toggle);
            }
        });
    }

    const inventoryTab = htmlQuery(html, ".tab[data-tab='inventory'] .inventory-list");
    if (inventoryTab) {
        for (const staff of getStaves(actor)) {
            const generateAttackBtn = htmlQuery(
                inventoryTab,
                `[data-item-id="${staff.id}"] .item-controls [data-action="generate-attack"]`
            );
            if (!generateAttackBtn) continue;

            const generateStaffBtn = createHTMLElement("a", {
                dataset: {
                    tooltip: MODULE.path("sheet.generate.tooltip"),
                },
                innerHTML: "<i class='fa-solid fa-wand-magic fa-fw'></i>",
            });

            generateStaffBtn.addEventListener("click", () => generateNpcStaff(actor, staff));

            generateAttackBtn.replaceWith(generateStaffBtn);
        }
    }
}

async function generateNpcStaff(actor: NPCPF2e, item: ActorStaff<NPCPF2e>) {
    const existing = actor.spellcasting.spellcastingFeatures.at(0);
    const maxCharges = getActorMaxRank(actor);

    const entrySource = createSpellcastingSource({
        name: item.name,
        category: "charges",
        tradition: existing?.tradition ?? "arcane",
        attribute: existing?.attribute ?? "cha",
    });

    const dc = existing?.system.spelldc.dc ?? calculateCreatureDC(actor);

    entrySource.system.spelldc = {
        dc,
        value: existing?.system.spelldc.value ?? dc - 10,
    };

    entrySource.system.slots = {
        slot1: { value: maxCharges, max: maxCharges },
    };

    const [entry] = await actor.createEmbeddedDocuments("Item", [entrySource]);
    if (!entry?.isOfType("spellcastingEntry")) return;

    const spellsSources = await getSpells(item, maxCharges, entry.id);
    await actor.createEmbeddedDocuments("Item", spellsSources);

    info("sheet.generate.confirm", { name: item.name });
}

async function onRenderCharacterSheetPF2e(sheet: CharacterSheetPF2e<CharacterPF2e>, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];
    const contentElement = htmlQuery(html, ".sheet-content");
    if (!contentElement) return;

    const isOwner = actor.isOwner;
    const spellsTab = htmlQuery(contentElement, ".tab[data-tab='spellcasting']");
    const highlightItems = getSetting("addedHighlight");

    if (isOwner) {
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
                    tooltip: canPrep ? localize("sheet.title") : getDailiesSummary(actor),
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

        const vesselsData = getAnimistVesselsData(actor);
        if (vesselsData) {
            const { entry, primary } = vesselsData;
            const entryEl = htmlQuery(spellsTab, `[data-item-id="${entry.id}"]`);
            const spellElements = entryEl?.querySelectorAll<HTMLElement>(".spell") ?? [];

            for (const spellEl of spellElements) {
                const itemId = spellEl.dataset.itemId ?? "";
                const isPrimary = primary.includes(itemId);

                const star = isPrimary ? "solid" : "regular";
                const starEl = createHTMLElement(isOwner ? "a" : "span", {
                    innerHTML: `<i class="fa-${star} fa-fw fa-star"></i>`,
                    dataset: {
                        action: "toggle-assign-primary",
                        tooltip: localize("sheet.primary", isPrimary ? "unassign" : "assign"),
                    },
                });

                if (isOwner) {
                    starEl.addEventListener("click", async (event) => {
                        await toggleAnimistVesselPrimary(actor, itemId);
                    });
                }

                htmlQuery(spellEl, ".item-controls")?.prepend(starEl);

                if (!isPrimary) {
                    htmlQuery(spellEl, "button.cast-spell")?.setAttribute("disabled", "true");

                    const nameEl = htmlQuery(spellEl, ".name");
                    if (nameEl) {
                        nameEl.style.color = "var(--color-disabled)";
                        nameEl.style.textDecoration = "line-through";
                    }
                }
            }
        }
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
        if (highlightItems) {
            const addedItems = getActorFlag(actor, "addedItems") ?? [];

            for (const id of addedItems) {
                const itemElements = contentElement.querySelectorAll(`[data-item-id="${id}"]`);

                for (const itemElement of itemElements) {
                    itemElement.classList.add("temporary");
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

function onRenderFamiliarSheetPF2e(sheet: FamiliarSheetPF2e<FamiliarPF2e>, $html: JQuery) {
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
    this: CharacterSheetPF2e<CharacterPF2e>,
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
        ) as unknown as SpellcastingEntry<CharacterPF2e>;

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

                messageSource.whisper;

                return getDocumentClass("ChatMessage").create(
                    messageSource as ChatMessageCreateData<ChatMessagePF2e>,
                    {
                        renderSheet: false,
                    }
                );
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
    ACTOR_PREPARE_EMBEDDED_DOCUMENTS,
    onActorPrepareEmbeddedDocuments,
    onCharacterPrepareData,
    onCharacterSheetGetData,
    onRenderCharacterSheetPF2e,
    onRenderFamiliarSheetPF2e,
    onRenderNPCSheetPF2e,
};
