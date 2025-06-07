import { createDaily } from "daily";
import { utils } from "utils";

const experimentalSpellshaping = createDaily({
    key: "experimental-spellshaping",
    items: [
        {
            slug: "experimental", // Experimental Spellshaping
            uuid: "Compendium.pf2e.classfeatures.Item.89zWKD2CN7nRu2xp",
            required: true,
            condition: (actor) => actor.level >= 4,
        },
    ],
    label: (actor, items) => items.experimental.name,
    rows: () => {
        return [
            {
                slug: "feat",
                type: "drop",
                filter: {
                    type: "feat",
                    search: {
                        category: ["class"],
                        traits: ["spellshape", "wizard"],
                        level: "half",
                    },
                },
            },
        ];
    },
    process: async ({ rows, items, messages, addFeat }) => {
        const uuid = rows.feat.uuid;
        const source = await utils.createFeatSource(uuid);

        addFeat(source, items.experimental);
        messages.add("feats", { uuid });
    },
});

export { experimentalSpellshaping };
