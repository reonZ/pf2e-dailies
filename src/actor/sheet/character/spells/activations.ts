import { createChargesElement } from "actor";
import { ActivationsEntriesData, ACTIVATIONS_ENTRY_TYPES } from "data";
import {
    addListener,
    CharacterPF2e,
    CharacterSheetData,
    equipItemToUse,
    getEquipAnnotation,
    htmlQuery,
    MODULE,
    R,
} from "foundry-helpers";

async function updateTypeEntries(
    actor: CharacterPF2e,
    spellsTab: HTMLElement,
    highlightItems: boolean,
    { getData, setCharges }: ActivationsEntriesData,
) {
    const data = getData(actor);
    if (!data) return;

    const item = data ? actor.inventory.get(data.staffId) : undefined;
    if (!item) return;

    const itemId = data.staffId;
    const container = itemId ? htmlQuery(spellsTab, `[data-container-id="${itemId}-casting"]`) : undefined;
    if (!container) return;

    const rowControls = container.querySelectorAll(".item-controls");
    const handles = container.querySelectorAll<HTMLElement>(".item-name");

    if (highlightItems) {
        container.classList.add("dailies-temporary");
    }

    for (const controls of rowControls ?? []) {
        controls.innerHTML = "";
    }

    for (const handle of handles ?? []) {
        handle.classList.remove("drag-handle");
        handle.draggable = false;
        delete handle.dataset.dragHandle;
    }

    const charges = data.charges;

    const annotationData = getEquipAnnotation(item);
    const chargesElement = await createChargesElement(actor, charges, false, annotationData);

    addListener(chargesElement, "[data-action='change-charges']", "change", (el: HTMLInputElement) => {
        const value = Math.clamp(el.valueAsNumber, 0, charges.max);
        setCharges(actor, value);
    });

    addListener(chargesElement, "[data-action='reset-charges']", async () => {
        setCharges(actor, charges.max);
    });

    if (annotationData) {
        addListener(chargesElement, "button", () => {
            equipItemToUse(actor, item, annotationData);
        });
    }

    htmlQuery(container, ".spell-ability-data .statistic-values")?.after(chargesElement);
}

async function updateSpellcastingEntries(actor: CharacterPF2e, spellsTab: HTMLElement, highlightItems: boolean) {
    return Promise.all(
        R.values(ACTIVATIONS_ENTRY_TYPES).map((entryData) =>
            updateTypeEntries(actor, spellsTab, highlightItems, entryData),
        ),
    );
}

function moveActionvationEntry(
    actor: CharacterPF2e,
    data: CharacterSheetData,
    staffData: dailies.ActivationFlag | undefined,
) {
    if (!staffData) return data;

    const staff = actor.inventory.get(staffData.staffId);
    if (!staff) return data;

    const collectionId = `${staff.id}-casting`;
    const knownCollections = data.spellCollectionGroups["known-spells"];

    const collectionIndex = knownCollections.findIndex((group) => group.id === collectionId);
    if (collectionIndex === -1) return data;

    const collectionGroup = knownCollections.splice(collectionIndex, 1)[0];
    data.spellCollectionGroups.activations.unshift(collectionGroup);
}

function moveCharacterSheetActicationsData(actor: CharacterPF2e, data: CharacterSheetData) {
    for (const [key, { getData }] of R.entries(ACTIVATIONS_ENTRY_TYPES)) {
        try {
            moveActionvationEntry(actor, data, getData(actor));
        } catch (error: any) {
            MODULE.error(`CharacterSheetPF2e#getData (${key})`, error);
        }
    }
}

export { moveCharacterSheetActicationsData, updateSpellcastingEntries };
