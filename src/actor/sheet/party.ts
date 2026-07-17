import { openPartyDailiesInterfaces } from "actor";
import { ActorPF2e, ActorSheetPF2e, createHTMLElement, htmlQuery, localize, MODULE } from "foundry-helpers";

function addPartyDailiesButton(actor: ActorPF2e, html: HTMLElement) {
    if (!actor.isOfType("party")) return;

    const buttons =
        htmlQuery(html, `.tab[data-tab="exploration"] .content-header .buttons`) ??
        htmlQuery(html, ".content-header .buttons");
    if (!buttons || buttons.querySelector("[data-action='dailies']")) return;

    const label = localize("sheet.party.dailyPrep");
    const button = createHTMLElement("button", {
        classes: ["icon", "fa-solid", "fa-fw", "fa-mug-saucer"],
        dataset: {
            action: "dailies",
            tooltip: label,
        },
    });

    button.type = "button";
    button.setAttribute("aria-label", label);
    button.addEventListener("click", () => {
        openPartyDailiesInterfaces(actor);
    });

    buttons.append(button);
}

function onPartySheetActivateListeners(
    this: ActorSheetPF2e<ActorPF2e>,
    wrapped: libWrapper.RegisterCallback,
    html: JQuery,
) {
    wrapped(html);

    try {
        addPartyDailiesButton(this.actor, html[0]);
    } catch (error: any) {
        MODULE.error("PartySheetPF2e#activateListeners", error);
    }
}

function onRenderPartySheetPF2e(sheet: ActorSheetPF2e<ActorPF2e>, $html: JQuery) {
    addPartyDailiesButton(sheet.actor, $html[0]);
}

export { onPartySheetActivateListeners, onRenderPartySheetPF2e };
