import { createDaily } from "../daily";
import { utils } from "../utils";

const ICON = "systems/pf2e/icons/equipment/weapons/wish-knife.webp";
const featUUID = "Compendium.pf2e.feats-srd.Item.78pkCdFaY8hI07Lj";

const ceremonialKnife = createDaily({
    key: "ceremonial-knife",
    condition: (actor) => actor.itemTypes.weapon.some((weapon) => weapon.group === "knife"),
    items: [
        {
            slug: "ceremonial", // Ceremonial Knife
            uuid: featUUID,
            required: true,
        },
    ],
    label: (actor, items) => items.ceremonial.name,
    prepare: (actor) => {
        const rank = Math.ceil((actor.level - 5) / 2);
        return {
            rank: Math.max(rank, 1) as OneToTen,
        };
    },
    rows: (actor, items, custom) => {
        return [
            {
                type: "drop",
                slug: "spell",
                filter: {
                    type: "spell",
                    search: {
                        category: ["spell"],
                        rank: custom.rank,
                    },
                },
            },
        ];
    },
    process: async ({ items, rows, custom, messages, addItem }) => {
        const uuid = rows.spell.uuid;
        const rank = custom.rank;
        const label = utils.getSpellWithRankLabel(uuid, rank);
        const source = await utils.createWandSource({
            uuid,
            level: rank,
            itemImg: ICON,
            itemName: items.ceremonial.name,
        });

        addItem(source);
        messages.add("ceremonial", { uuid, label });
    },
});

export { ceremonialKnife };
