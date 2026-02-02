import { createDaily } from "daily";
import { localize, R, SYSTEM } from "module-helpers";
import { utils } from "utils";

const adaptiveTalent = createDaily({
    key: "adaptive-talent",
    items: [
        {
            slug: "talent", // Adaptive Talent
            uuid: SYSTEM.uuid<ItemUUID>(
                "Compendium.sf2e-anachronism.class-features.Item.9nO9EkhE1TiS0Yh6",
                "Compendium.sf2e.class-features.Item.9nO9EkhE1TiS0Yh6",
            ),
            required: true,
        },
        {
            slug: "endless", // Endlessly Adaptive
            uuid: SYSTEM.uuid<ItemUUID>(
                "Compendium.sf2e-anachronism.feats.Item.kTmHzD83BRz8bvmg",
                "Compendium.sf2e.feats.Item.kTmHzD83BRz8bvmg",
            ),
        },
    ],
    label: (_actor, items) => items.talent.name,
    rows: (actor, items) => {
        const level = actor.level;
        const nbFeats = (level >= 15 ? 3 : level >= 9 ? 2 : 1) + (items.endless ? 2 : 0);

        return R.range(1, nbFeats + 1).map((i) => {
            return {
                type: "drop",
                slug: `feat${i}`,
                label: localize("label.feat", { nb: i }),
                filter: {
                    type: "feat",
                    search: {
                        category: ["skill"],
                        level,
                    },
                },
            };
        });
    },
    process: async ({ items, rows, messages, addFeat }) => {
        const promises = R.values(rows).map(async ({ uuid }) => {
            try {
                const source = await utils.createFeatSource(uuid);
                addFeat(source, items.talent);
                messages.add("feats", { uuid });
            } catch {}
        });

        await Promise.all(promises);
    },
});

export { adaptiveTalent };
