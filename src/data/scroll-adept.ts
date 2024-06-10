import { R } from "foundry-pf2e";
import { createDaily } from "../daily";
import { DailyRowDropSpell } from "../types";
import { utils } from "../utils";

const adeptUUID = "Compendium.pf2e.feats-srd.Item.u5DBg0LrBUKP0JsJ";

const scrollAdept = createDaily({
    key: "scroll-adept",
    items: [
        {
            slug: "adept", // Scroll Adept
            uuid: adeptUUID,
            required: true,
        },
    ],
    label: (actor, items) => items.adept.name,
    prepare: (actor) => {
        const maxRank = utils.getSpellcastingMaxRank(actor, { tradition: "arcane" });
        const proficiency = actor.system.proficiencies.spellcasting.rank;

        const ranks = R.pipe(
            R.range(2, Math.clamp(proficiency, 2, 4) + 2),
            R.map((r): { rank: OneToTen; row: `rank${OneToTen}` } => {
                const rank = (maxRank - r) as OneToTen;
                return {
                    rank,
                    row: `rank${rank}`,
                };
            }),
            R.filter(({ rank }) => rank > 0)
        );

        return { ranks };
    },
    rows: (actor, items, custom) => {
        return custom.ranks.map(
            ({ rank, row }): DailyRowDropSpell => ({
                slug: row,
                type: "drop",
                label: utils.getSpellRankLabel(rank),
                filter: {
                    type: "spell",
                    search: {
                        category: ["spell"],
                        traditions: ["arcane"],
                        rank,
                    },
                },
            })
        );
    },
    process: async ({ rows, custom, messages, addItem }) => {
        for (const data of custom.ranks) {
            const { uuid } = rows[data.row];
            if (!uuid) continue;

            const label = utils.getSpellWithRankLabel(uuid, data.rank);
            const source = await utils.createSpellScrollSource({
                uuid,
                level: data.rank,
            });

            addItem(source);
            messages.add("scrolls", { uuid, label });
        }
    },
});

export { scrollAdept };
