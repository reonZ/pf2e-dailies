import { canPrepareDailies, getActorFlag, getDailiesSummary, openDailiesInterface } from "actor";
import {
    getAnimistVesselsData,
    getStaffData,
    setStaffChargesValue,
    toggleAnimistVesselPrimary,
} from "data";
import {
    addListener,
    CharacterPF2e,
    CharacterSheetData,
    CharacterSheetPF2e,
    createHTMLElement,
    getSetting,
    htmlQuery,
    localize,
    MODULE,
} from "module-helpers";
import { createChargesElement, renderChargesEntries } from ".";

async function onCharacterSheetGetData(
    this: CharacterSheetPF2e<CharacterPF2e>,
    wrapped: libWrapper.RegisterCallback,
    options?: ActorSheetOptions
) {
    const data = (await wrapped(options)) as CharacterSheetData;

    try {
        const actor = this.actor;
        const staffId = getStaffData(actor)?.staffId;
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

function onRenderCharacterSheetPF2e(sheet: CharacterSheetPF2e<CharacterPF2e>, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];
    const highlightItems = getSetting("addedHighlight");

    addDailiesIcon(actor, html);
    updateSpellsTab(actor, html, highlightItems);

    if (highlightItems) {
        const addedItems = getActorFlag(actor, "addedItems") ?? [];

        for (const id of addedItems) {
            const itemElements = html.querySelectorAll(`.sheet-content [data-item-id="${id}"]`);

            for (const itemElement of itemElements) {
                itemElement.classList.add("temporary");
            }
        }
    }
}

function updateSpellsTab(actor: CharacterPF2e, html: HTMLElement, highlightItems: boolean) {
    const spellsTab = htmlQuery(html, ".sheet-content .tab[data-tab='spellcasting']");
    if (!spellsTab) return;

    const isOwner = actor.isOwner;

    renderChargesEntries(actor, spellsTab, (container, charges, toggle) => {
        htmlQuery(container, ".spell-ability-data .statistic-values")?.after(charges);
        if (isOwner) {
            htmlQuery(container, ".action-header .item-controls")?.prepend(toggle);
        }
    });

    updateAnimistEntries(actor, spellsTab, isOwner);
    updateStavesEntries(actor, spellsTab, highlightItems);
}

async function updateStavesEntries(
    actor: CharacterPF2e,
    spellsTab: HTMLElement,
    highlightItems: boolean
) {
    const staffData = getStaffData(actor);
    const staff = staffData ? actor.inventory.get(staffData.staffId) : undefined;
    const staffId = staffData?.staffId;
    const staffContainer = staffId
        ? htmlQuery(spellsTab, `[data-container-id="${staffId}-casting"]`)
        : undefined;

    if (!staffContainer || !staffData || !staff) return;

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

    const annotation: AuxiliaryAnnotation = isEquipped
        ? "sheathe"
        : staff.carryType === "dropped"
        ? "pick-up1H"
        : staff.isStowed
        ? "retrieve1H"
        : "draw1H";

    const action = isEquipped
        ? undefined
        : {
              cost: annotation === "retrieve1H" ? 2 : 1,
              id: staff.id,
              label: localize("staves.action", annotation),
          };

    const chargesElement = await createChargesElement(actor, charges, false, action);

    addListener(
        chargesElement,
        "[data-action='change-charges']",
        "change",
        (el: HTMLInputElement) => {
            const value = Math.clamp(el.valueAsNumber, 0, charges.max);
            setStaffChargesValue(actor, value);
        }
    );

    addListener(chargesElement, "[data-action='reset-charges']", async () => {
        setStaffChargesValue(actor, charges.max);
    });

    if (!isEquipped) {
        addListener(chargesElement, "button", () => {
            const action = actor.system.actions.find((action) => action.item === staff);
            const aux = action?.auxiliaryActions.find((aux) => aux.fullAnnotation === annotation);
            aux?.execute();
        });
    }

    htmlQuery(staffContainer, ".spell-ability-data .statistic-values")?.after(chargesElement);
}

function updateAnimistEntries(actor: CharacterPF2e, spellsTab: HTMLElement, isOwner: boolean) {
    const vesselsData = getAnimistVesselsData(actor);
    if (!vesselsData) return;

    const { entry, primary } = vesselsData;
    const entryEl = htmlQuery(spellsTab, `[data-item-id="${entry.id}"]`);
    const spellElements = entryEl?.querySelectorAll<HTMLElement>(".spell") ?? [];

    for (const spellEl of spellElements) {
        const itemId = spellEl.dataset.itemId ?? "";
        const isPrimary = primary.includes(itemId);

        const star = isPrimary ? "solid" : "regular";
        const starEl = createHTMLElement(isOwner ? "a" : "span", {
            content: `<i class="fa-${star} fa-fw fa-star"></i>`,
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

function addDailiesIcon(actor: CharacterPF2e, html: HTMLElement) {
    if (!actor.isOwner) return;

    const parent = htmlQuery(html, "aside .hitpoints .hp-small");
    if (!parent) return;

    const canPrep = canPrepareDailies(actor);
    const classes = ["roll-icon", "dailies"];

    if (!canPrep) {
        classes.push("inactive");
    }

    const icon = createHTMLElement("a", {
        content: "<i class='fa-solid fa-mug-saucer'></i>",
        classes,
        dataset: {
            tooltip: canPrep ? localize("sheet.title") : getDailiesSummary(actor),
            tooltipClass: canPrep ? "pf2e" : "pf2e pf2e-dailies-summary",
        },
    });

    parent.appendChild(icon);

    if (canPrep) {
        icon.addEventListener("click", () => {
            openDailiesInterface(actor);
        });
    }
}

type AuxiliaryAnnotation = "draw1H" | "pick-up1H" | "retrieve1H" | "sheathe";

export { onCharacterSheetGetData, onRenderCharacterSheetPF2e };
