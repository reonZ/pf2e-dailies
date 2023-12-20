const rows = [
	"first",
	"second",
	"third",
	"fourth",
	"fifth",
	"sixth",
	"seventh",
];

export function createScrollChain(key, uuids, label) {
	const daily = {
		key,
		label,
		item: {
			uuid: uuids[0],
		},
		children: [
			{
				slug: "expert",
				uuid: uuids[1],
			},
			{
				slug: "master",
				uuid: uuids[2],
			},
		],
		rows: [
			createRow("first", 1),
			createRow("second", 2, 8),
			createRow("third", 3, undefined, "expert"),
			createRow("fourth", 4, 14, "expert"),
			createRow("fifth", 5, 16, "expert"),
			createRow("sixth", 6, undefined, "master"),
			createRow("seventh", 7, 20, "master"),
		],
		process: async ({ utils, fields, addItem, messages }) => {
			for (const field of Object.values(fields)) {
				const uuid = field.uuid;
				const level = rows.indexOf(field.row) + 1;
				const source = await utils.createSpellScrollSource({ uuid, level });
				addItem(source);
				messages.add("scrolls", { uuid, label: source.name });
			}
		},
	};
	return daily;
}

function createRow(slug, level, minActorLevel, child) {
	const row = {
		type: "drop",
		slug,
		label: ({ utils }) => utils.spellRankLabel(level),
		filter: {
			type: "spell",
			search: {
				category: ["spell"],
				level,
			},
		},
	};
	if (minActorLevel)
		row.condition = ({ actor }) => actor.level >= minActorLevel;
	if (child) row.childPredicate = [child];
	return row;
}
