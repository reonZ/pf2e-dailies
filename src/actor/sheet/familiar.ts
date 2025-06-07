import { FamiliarPF2e, FamiliarSheetPF2e, getFlag } from "module-helpers";

function onRenderFamiliarSheetPF2e(sheet: FamiliarSheetPF2e<FamiliarPF2e>, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];
    const itemElements = html.querySelectorAll<HTMLElement>(
        ".section-container:not(.familiar-section) .actions-list [data-item-id]"
    );

    for (const itemElement of itemElements) {
        const itemId = itemElement.dataset.itemId as string;
        const item = actor.items.get(itemId);

        if (item && getFlag(item, "temporary")) {
            itemElement.classList.add("temporary");
        }
    }
}

export { onRenderFamiliarSheetPF2e };
