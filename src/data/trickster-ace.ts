import { localize } from "foundry-pf2e";
import { createDaily } from "../daily";
import { utils } from "../utils";

const tricksterAce = createDaily({
    key: "trickster-ace",
    items: [
        {
            slug: "ace", // Trickster Ace
            uuid: "Compendium.pf2e.feats-srd.Item.POrE3ZgBRdBL9MsW",
            required: true,
        },
    ],
    label: (actor, items) => items.ace.name,
    rows: () => {
        return [
            {
                type: "drop",
                slug: "spell",
                note: localize("interface.drop.notes.ace"),
                onDrop: (item: SpellPF2e) => {
                    return true;
                },
                filter: {
                    type: "spell",
                    search: {
                        rank: 4,
                    },
                },
            },
        ];
    },
    process: async ({ actor, items, rows, messages, addItem }) => {
        const identifier = foundry.utils.randomID();
        const uuid = rows.spell.uuid;
        const statistic = actor.classDC;
        const spellSource = await utils.createSpellSource(uuid, { identifier });
        const entrySource = utils.createSpellcastingEntrySource({
            category: "innate",
            identifier,
            name: items.ace.name,
            tradition: spellSource.system.traits.traditions[0],
            proficiencyRank: statistic?.rank,
            attribute: statistic?.attribute,
            proficiencySlug: statistic?.slug,
        });

        addItem(entrySource);
        addItem(spellSource);
        messages.add("spells", { uuid });
    },
});

export { tricksterAce };
