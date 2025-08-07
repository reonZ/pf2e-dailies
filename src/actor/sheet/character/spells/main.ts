import { createChargesElement } from "actor";
import {
    addListener,
    CharacterPF2e,
    createHTMLElement,
    htmlQuery,
    NPCPF2e,
    SpellcastingEntryPF2eWithCharges,
} from "module-helpers";
import { updateAnimistEntries, updateStavesEntries } from ".";

function updateSpellsTab(actor: CharacterPF2e, html: HTMLElement, highlightItems: boolean) {
    const spellsTab = htmlQuery(html, `.sheet-content .tab[data-tab="spellcasting"]`);
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

async function renderChargesEntries(
    actor: CharacterPF2e | NPCPF2e,
    parentElement: HTMLElement,
    callback: (
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
            (el: HTMLInputElement) => {
                const value = Math.clamp(el.valueAsNumber, 0, charges.max);
                entry.update({ "system.slots.slot1.value": value });
            }
        );

        addListener(
            chargesElement,
            "[data-action='change-max-charges']",
            "change",
            (el: HTMLInputElement) => {
                const value = Math.max(el.valueAsNumber, 0);
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
            content: `<i class="${classStr} fa-fw fa-list-alt"></i>`,
            dataset: {
                action: "toggle-show-slotless-ranks",
                tooltip: "PF2E.ToggleSlotlessSpellLevelsTitle",
            },
        });

        callback?.(entryContainer, chargesElement, toggleElement);
    }
}

export { updateSpellsTab };
