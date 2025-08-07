import { addRetrainBtn } from "actor/sheet/_utils";
import { getAnimistVesselsData } from "data";
import { CharacterPF2e, htmlQuery, localize } from "module-helpers";

function updateAnimistEntries(actor: CharacterPF2e, spellsTab: HTMLElement, isOwner: boolean) {
    const vesselsData = getAnimistVesselsData(actor);
    if (!vesselsData) return;

    const { entry, primary } = vesselsData;
    const entryEl = htmlQuery(spellsTab, `[data-item-id="${entry.id}"]`);
    const spellElements = entryEl?.querySelectorAll<HTMLElement>(".spell") ?? [];

    for (const spellEl of spellElements) {
        const itemId = spellEl.dataset.itemId ?? "";
        if (primary.includes(itemId)) continue;

        addRetrainBtn(
            actor,
            htmlQuery(spellEl, ".item-controls"),
            "extra.dailies.animist.primaryVessels",
            isOwner,
            itemId,
            localize("sheet.vessel")
        );

        htmlQuery(spellEl, "button.cast-spell")?.classList.add("inactive");

        const nameEl = htmlQuery(spellEl, ".name");
        if (nameEl) {
            nameEl.style.color = "var(--color-disabled)";
            nameEl.style.textDecoration = "line-through";
        }
    }
}

export { updateAnimistEntries };
