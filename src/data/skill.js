export function createTrainedSkillDaily(key, uuid, label) {
	const daily = {
		key,
		label,
		item: {
			uuid,
		},
		rows: [createComboSkillRow("skill", 0)],
		process: ({ fields, addItem, addRule, utils, messages }) => {
			let value = fields.skill.value;

			if (fields.skill.input === "true") {
				const source = utils.createLoreSource({ name: value, rank: 1 });
				addItem(source);
			} else {
				const source = utils.createSkillRuleElement({ skill: value, value: 1 });
				value = utils.skillLabel(value);
				addRule(source);
			}

			messages.add("skills", { uuid, selected: value, label });
		},
	};
	return daily;
}

export function createComboSkillRow(slug, rank, extras = {}) {
	return {
		type: "combo",
		slug,
		options: ({ actor, utils }) => {
			const actorSkills = actor.skills;
			return utils.skillNames.filter((x) => actorSkills[x].rank === rank);
		},
		labelizer: ({ utils }) => utils.skillLabel,
		...extras,
	};
}

export function createTrainedLoreDaily(key, uuid, label) {
	const daily = {
		key,
		label,
		item: {
			uuid,
		},
		rows: [
			{
				type: "input",
				slug: "skill",
			},
		],
		process: ({ addItem, utils, fields, messages }) => {
			const value = fields.skill.value;
			const source = utils.createLoreSource({ name: value, rank: 1 });
			addItem(source);
			messages.add("skills", { uuid, selected: value, label });
		},
	};
	return daily;
}
