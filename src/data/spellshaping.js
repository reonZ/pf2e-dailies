export const spellshaping = {
	key: "metamagical",
	item: {
		uuid: "Compendium.pf2e.classfeatures.Item.89zWKD2CN7nRu2xp", // Experimental Spellshaping
		condition: ({ actor }) => actor.level >= 4,
	},
	rows: [
		{
			type: "drop",
			slug: "feat",
			filter: {
				type: "feat",
				search: {
					category: ["class"],
					traits: { selected: ["spellshape", "wizard"], conjunction: "and" },
					level: "half",
				},
			},
		},
	],
	process: async ({ utils, fields, addFeat, messages }) => {
		const uuid = fields.feat.uuid;
		const source = await utils.createFeatSource(uuid);
		addFeat(source);
		messages.add("feats", { uuid });
	},
};
