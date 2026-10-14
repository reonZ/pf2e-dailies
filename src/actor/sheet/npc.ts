import { ACTIVATIONS_ENTRY_TYPES } from "data";
import {
    calculateCreatureDC,
    createHTMLElement,
    createSpellcastingSource,
    getActorMaxRank,
    htmlQuery,
    localize,
    MODULE,
    NPCPF2e,
    NPCSheetPF2e,
    R,
} from "foundry-helpers";
import { renderChargesEntries } from ".";
import { utils } from "utils";

function onRenderNPCSheetPF2e(sheet: NPCSheetPF2e, $html: JQuery) {
    const actor = sheet.actor;
    const html = $html[0];

    const spellsTab = htmlQuery(html, ".tab[data-tab='spells']");
    if (spellsTab) {
        renderChargesEntries(actor, spellsTab, (container, charges, toggle) => {
            htmlQuery(container, ":scope > .header")?.after(charges);
            if (actor.isOwner) {
                htmlQuery(container, ":scope > .header > .item-controls")?.prepend(toggle);
            }
        });
    }

    const inventoryTab = htmlQuery(html, ".tab[data-tab='inventory'] .inventory-list");
    if (!inventoryTab) return;

    for (const { getItems } of R.values(ACTIVATIONS_ENTRY_TYPES)) {
        for (const item of getItems(actor)) {
            const controls = htmlQuery(inventoryTab, `[data-item-id="${item.id}"] .item-controls`);
            if (!controls) continue;

            const btn = createHTMLElement("a", {
                dataset: {
                    tooltip: MODULE.path("sheet.generate.tooltip"),
                },
                content: "<i class='fa-solid fa-wand-magic fa-fw'></i>",
            });

            btn.addEventListener("click", () => generateNpcActivationEntry(actor, item));

            const generateBtn = htmlQuery(controls, `[data-action="generate-attack"]`);
            if (generateBtn) {
                generateBtn.replaceWith(btn);
            } else {
                const editBtn = htmlQuery(controls, "[data-action='edit-item']");
                if (editBtn) {
                    editBtn.before(btn);
                } else {
                    controls.prepend(btn);
                }
            }
        }
    }
}

async function generateNpcActivationEntry(actor: NPCPF2e, item: dailies.ActivationItem<NPCPF2e>) {
    const existing = actor.spellcasting.spellcastingFeatures.at(0);
    const maxCharges = getActorMaxRank(actor);

    const entrySource = createSpellcastingSource({
        name: item.name,
        category: "charges",
        tradition: existing?.tradition ?? "arcane",
        attribute: existing?.attribute ?? "cha",
    });

    const dc = existing?.system.spelldc.dc ?? calculateCreatureDC(actor);

    entrySource.system.spelldc = {
        dc,
        value: existing?.system.spelldc.value ?? dc - 10,
    };

    entrySource.system.slots = {
        slot1: { value: maxCharges, max: maxCharges },
    };

    const [entry] = await actor.createEmbeddedDocuments("Item", [entrySource]);
    if (!entry?.isOfType("spellcastingEntry")) return;

    const spellsSources = await utils.getPhysicalItemSpells(item, maxCharges, entry.id);
    await actor.createEmbeddedDocuments("Item", spellsSources);

    localize.info("sheet.generate.confirm", { name: item.name });
}

export { onRenderNPCSheetPF2e };
