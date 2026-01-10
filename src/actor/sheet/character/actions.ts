import { getCommanderTactics, isTacticAbility } from "data";
import { CharacterPF2e, htmlQuery } from "module-helpers";
import { createRetrainBtn } from "..";

function updateActionsTab(actor: CharacterPF2e, html: HTMLElement) {
    const actionsTab = htmlQuery(html, `.sheet-content .tab[data-tab="actions"]`);
    if (!actionsTab) return;

    updateTacticsEntries(actor, actionsTab);
}

function updateTacticsEntries(actor: CharacterPF2e, actionsTab: HTMLElement) {
    const tactics = getCommanderTactics(actor);
    if (!tactics.length) return;

    const encounterTab = htmlQuery(actionsTab, `.actions-panels [data-tab="encounter"]`);
    if (!encounterTab) return;

    const isOwner = actor.isOwner;
    const actionsElements = encounterTab.querySelectorAll<HTMLLIElement>(".action[data-item-id]");

    for (const el of actionsElements) {
        const itemId = el.dataset.itemId as string;
        if (tactics.includes(itemId) || !isTacticAbility(actor.items.get(itemId))) continue;

        el.classList.add("inactive");

        if (isOwner) {
            const btn = createRetrainBtn(actor, itemId, "tactic");
            htmlQuery(el, ".item-controls")?.prepend(btn);
        }
    }
}

export { updateActionsTab };
