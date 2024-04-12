import { createDaily } from "../daily";
import { utils } from "../utils";

const combatUUID = "Compendium.pf2e.classfeatures.Item.8g6HzARbhfcgilP8";
const improvedUUID = "Compendium.pf2e.classfeatures.Item.W2rwudMNcAxs8VoX";

const combatFlexibility = createDaily({
    key: "combat-flexibility",
    items: [
        {
            slug: "combat", // Combat Flexibility
            uuid: combatUUID,
            required: true,
        },
        {
            slug: "improved", // Improved Flexibility
            uuid: improvedUUID,
        },
    ],
    label: (actor, items) => items.combat.name,
    rows: (actor, items) => {
        return [
            {
                type: "drop",
                slug: "combat",
                label: `PF2E.Level8`,
                filter: {
                    type: "feat",
                    search: {
                        category: ["class"],
                        traits: ["fighter"],
                        level: 8,
                    },
                },
            },
            {
                type: "drop",
                slug: "improved",
                label: `PF2E.Level14`,
                filter: {
                    type: "feat",
                    search: {
                        category: ["class"],
                        traits: ["fighter"],
                        level: 14,
                    },
                },
                condition: !!items.improved,
            },
        ];
    },
    process: async ({ items, rows, messages, addFeat }) => {
        const source = await utils.createFeatSource(rows.combat.uuid);
        addFeat(source, items.combat);
        messages.add("feats", { uuid: rows.combat.uuid });

        if (rows.improved) {
            const source = await utils.createFeatSource(rows.improved.uuid);
            addFeat(source, items.improved);
            messages.add("feats", { uuid: rows.improved.uuid });
        }
    },
});

export { combatFlexibility };
