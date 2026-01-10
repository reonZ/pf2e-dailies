import { createChargesElement } from "actor";
import { getStaffData, setStaffChargesValue } from "data";
import { addListener, CharacterPF2e, equipItemToUse, getEquipAnnotation, htmlQuery } from "module-helpers";

async function updateStavesEntries(actor: CharacterPF2e, spellsTab: HTMLElement, highlightItems: boolean) {
    const staffData = getStaffData(actor);
    const staff = staffData ? actor.inventory.get(staffData.staffId) : undefined;
    const staffId = staffData?.staffId;
    const staffContainer = staffId ? htmlQuery(spellsTab, `[data-container-id="${staffId}-casting"]`) : undefined;

    if (!staffContainer || !staffData || !staff) return;

    const rowControls = staffContainer.querySelectorAll(".item-controls");
    const handles = staffContainer.querySelectorAll<HTMLElement>(".item-name");

    if (highlightItems) {
        staffContainer.classList.add("dailies-temporary");
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

    const annotationData = getEquipAnnotation(staff);
    const chargesElement = await createChargesElement(actor, charges, false, annotationData);

    addListener(chargesElement, "[data-action='change-charges']", "change", (el: HTMLInputElement) => {
        const value = Math.clamp(el.valueAsNumber, 0, charges.max);
        setStaffChargesValue(actor, value);
    });

    addListener(chargesElement, "[data-action='reset-charges']", async () => {
        setStaffChargesValue(actor, charges.max);
    });

    if (annotationData) {
        addListener(chargesElement, "button", () => {
            equipItemToUse(actor, staff, annotationData);
        });
    }

    htmlQuery(staffContainer, ".spell-ability-data .statistic-values")?.after(chargesElement);
}

export { updateStavesEntries };
