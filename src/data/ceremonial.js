const ICON = "systems/pf2e/icons/equipment/weapons/wish-knife.webp";

export const ceremonialKnife = {
	key: "ceremonial",
	item: {
		uuid: "Compendium.pf2e.feats-srd.Item.78pkCdFaY8hI07Lj",
		condition: ({ actor }) =>
			actor.itemTypes.weapon.some((weapon) => weapon.group === "knife"),
	},
	rows: [
		{
			type: "drop",
			slug: "spell",
			label: ({ utils, actor }) => utils.spellRankLabel(calculateRank(actor)),
			filter: {
				type: "spell",
				search: ({ actor }) => ({
					category: ["spell"],
					level: calculateRank(actor),
				}),
			},
		},
	],
	process: async ({ actor, fields, utils, item, addItem, messages }) => {
		const uuid = fields.spell.uuid;
		const level = calculateRank(actor);
		const source = await utils.createWandSource({
			uuid,
			level,
			itemName: item.name,
			itemImg: ICON,
		});

		addItem(source);

		messages.addGroup("ceremonial");
		messages.add("ceremonial", { uuid, label: source.name });
	},
};

function calculateRank(actor) {
	return Math.ceil((actor.level - 5) / 2);
}
