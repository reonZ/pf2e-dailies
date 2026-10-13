import { canPrepareDailies, getActorFlag, getDailiesSummary, openDailiesInterface } from "actor";
import {
    ActorSheetOptions,
    CharacterPF2e,
    CharacterSheetData,
    CharacterSheetPF2e,
    createHTMLElement,
    getSetting,
    htmlQuery,
    localize,
    R,
} from "foundry-helpers";
import { moveCharacterSheetActicationsData, updateActionsTab, updateSpellsTab } from ".";

async function onCharacterSheetGetData(
    this: CharacterSheetPF2e<CharacterPF2e>,
    wrapped: libWrapper.RegisterCallback,
    options?: ActorSheetOptions,
) {
    const data = (await wrapped(options)) as CharacterSheetData;
    moveCharacterSheetActicationsData(this.actor, data);
    return data;
}

function onRenderCharacterSheetPF2e(sheet: CharacterSheetPF2e<CharacterPF2e>, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];
    const highlight = getSetting("addedHighlight");
    const added = (highlight && getActorFlag(actor, "addedItems")) || [];
    const flagged = getActorFlag(actor, "flaggedItems") ?? {};

    addDailiesIcon(actor, html);
    updateActionsTab(actor, html);
    updateSpellsTab(actor, html, highlight);

    const content = htmlQuery(html, ".sheet-content");

    const getItemElements = (id: string) => {
        return content?.querySelectorAll(`[data-item-id="${id}"], [data-subitem-id="${id}"]`) ?? [];
    };

    for (const id of added) {
        for (const itemElement of getItemElements(id)) {
            itemElement.classList.add("dailies-temporary");
        }
    }

    for (const [id, dailies] of R.entries(flagged)) {
        if (!dailies.length) continue;

        const flagged = localize("sheet.flagged") + "<br>";

        for (const itemElement of getItemElements(id)) {
            const tooltip = dailies.length === 1 ? dailies[0] : dailies.join("<br>- ");
            const nameElement = htmlQuery(itemElement, ".name");
            const flagEl = createHTMLElement("span", {
                content: `<i class="fa-solid fa-flag-pennant"></i>`,
                dataset: {
                    tooltip: flagged + tooltip,
                },
            });

            nameElement?.insertAdjacentElement("afterbegin", flagEl);
        }
    }
}

function addDailiesIcon(actor: CharacterPF2e, html: HTMLElement) {
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

    if (canPrep && actor.isOwner) {
        icon.addEventListener("click", () => {
            openDailiesInterface(actor);
        });
    }
}

export { onCharacterSheetGetData, onRenderCharacterSheetPF2e };
