import { canPrepareDailies, getActorFlag, getDailiesSummary, openDailiesInterface } from "actor";
import { getStaffData } from "data";
import {
    CharacterPF2e,
    CharacterSheetData,
    CharacterSheetPF2e,
    createHTMLElement,
    getSetting,
    htmlQuery,
    localize,
    MODULE,
    R,
} from "module-helpers";
import { updateActionsTab, updateSpellsTab } from ".";

async function onCharacterSheetGetData(
    this: CharacterSheetPF2e<CharacterPF2e>,
    wrapped: libWrapper.RegisterCallback,
    options?: ActorSheetOptions,
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
    const highlight = getSetting("addedHighlight");
    const added = (highlight && getActorFlag(actor, "addedItems")) || [];
    const flagged = getActorFlag(actor, "flaggedItems") ?? {};

    addDailiesIcon(actor, html);
    updateActionsTab(actor, html);
    updateSpellsTab(actor, html, highlight);

    const getItemElements = (id: string) => {
        return html.querySelectorAll(`.sheet-content [data-item-id="${id}"]`);
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

export { onCharacterSheetGetData, onRenderCharacterSheetPF2e };
