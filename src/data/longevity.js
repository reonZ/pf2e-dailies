import { createComboSkillRow, processComboSkill } from "./skill";

export const longevities = {
	key: "longevities",
	item: {
		uuid: "Compendium.pf2e.feats-srd.Item.WoLh16gyDp8y9WOZ", // Ancestral Longevity
	},
	children: [
		{
			slug: "expert",
			uuid: "Compendium.pf2e.feats-srd.Item.vfuHVSuExvtyajkW", // Expert Longevity
		},
	],
	rows: [
		createComboSkillRow("ancestral", 0, {
			label: ({ item }) => item.name,
		}),
		createComboSkillRow("expert", 1, {
			label: ({ children }) => children.expert?.name,
			childPredicate: ["expert"],
		}),
	],
	process: async (api) => {
		const feats = [
			{ field: "ancestral", rank: 1, item: api.item },
			{ field: "expert", rank: 2, item: api.children.expert },
		];

		for (const { field, rank, item } of feats) {
			if (!api.fields[field]) continue;
			processComboSkill(api, {
				label: item.name,
				uuid: item.uuid,
				field,
				rank,
				parent: item,
			});
		}
	},
};
