export function createTrainedSkillDaily(key, uuid, label) {
	const daily = {
		key,
		label,
		item: {
			uuid,
		},
		rows: [createComboSkillRow("skill", 0)],
		process: (api) => {
			processComboSkill(api, { uuid, label });
		},
	};
	return daily;
}

export function processComboSkill(
	{ fields, addItem, addRule, utils, messages, removeRule },
	{ field = "skill", uuid, label, rank = 1, parent },
) {
	removeRule(
		(rule) =>
			rule.key === "ActiveEffectLike" &&
			rule.mode === "upgrade" &&
			rule.phase === "beforeDerived" &&
			rule.path?.startsWith("system.skills."),
		parent,
	);

	removeRule(
		(rule) =>
			rule.key === "RollOption" &&
			rule.toggleable &&
			rule.alwaysActive &&
			rule.phase === "beforeDerived" &&
			rule.suboptions.some((suboption) => suboption.label === "PF2E.SkillAcr"),
		parent,
	);

	let value = fields[field].value;

	if (fields[field].input === "true") {
		const source = utils.createLoreSource({ name: value, rank });
		addItem(source);
	} else {
		const source = utils.createSkillRuleElement({ skill: value, value: rank });
		value = utils.skillLabel(value);
		addRule(source, parent);
	}

	messages.add("skills", { uuid, selected: value, label });
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
