import { createComboSkillRow } from "./skill";

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
	process: async ({
		fields,
		addItem,
		addRule,
		item,
		children,
		utils,
		messages,
	}) => {
		const feats = [
			{ field: "ancestral", rank: 1, item: item },
			{ field: "expert", rank: 2, item: children.expert },
		];

		for (const { field, rank, item } of feats) {
			if (!fields[field]) continue;

			let value = fields[field].value;

			if (fields[field].input === "true") {
				const source = utils.createLoreSource({ name: value, rank });
				addItem(source);
			} else {
				const source = utils.createSkillRuleElement({
					skill: value,
					value: rank,
				});
				value = utils.skillLabel(value);
				addRule(source);
			}

			messages.add("skills", {
				uuid: item.uuid,
				selected: value,
				label: item.label,
			});
		}
	},
};
