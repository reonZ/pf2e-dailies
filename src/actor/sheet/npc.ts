import { ActorStaff, getSpells, getStaves } from "data";
import {
    calculateCreatureDC,
    createHTMLElement,
    createSpellcastingSource,
    getActorMaxRank,
    htmlQuery,
    info,
    MODULE,
    NPCPF2e,
    NPCSheetPF2e,
} from "module-helpers";
import { renderChargesEntries } from ".";

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

    for (const staff of getStaves(actor)) {
        const controls = htmlQuery(inventoryTab, `[data-item-id="${staff.id}"] .item-controls`);
        if (!controls) continue;

        const staffBtn = createHTMLElement("a", {
            dataset: {
                tooltip: MODULE.path("sheet.generate.tooltip"),
            },
            content: "<i class='fa-solid fa-wand-magic fa-fw'></i>",
        });

        staffBtn.addEventListener("click", () => generateNpcStaff(actor, staff));

        const generateBtn = htmlQuery(controls, `[data-action="generate-attack"]`);
        if (generateBtn) {
            generateBtn.replaceWith(staffBtn);
        } else {
            const editBtn = htmlQuery(controls, "[data-action='edit-item']");
            if (editBtn) {
                editBtn.before(staffBtn);
            } else {
                controls.prepend(staffBtn);
            }
        }
    }
}

async function generateNpcStaff(actor: NPCPF2e, item: ActorStaff<NPCPF2e>) {
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

    const spellsSources = await getSpells(item, maxCharges, entry.id);
    await actor.createEmbeddedDocuments("Item", spellsSources);

    info("sheet.generate.confirm", { name: item.name });
}

export { onRenderNPCSheetPF2e };
