import {
	MODULE_ID,
	findItemWithSourceId,
	getFlag,
	localize,
	subLocalize,
} from "../module";

const MIND_WEAPON_UUID =
	"Compendium.pf2e-dailies.equipment.Item.VpmEozw21aRxX15P";
const MALLEABLE_MENTAL_FORGE_UUID =
	"Compendium.pf2e.feats-srd.Item.PccekOihIbRWdDky";

const WEAPON_BASE_TYPES = {
	0: { die: "d4", traits: ["finesse", "agile"], usage: "held-in-one-hand" },
	1: { die: "d6", traits: ["finesse"], usage: "held-in-one-hand" },
	2: { die: "d8", traits: [], usage: "held-in-one-hand" },
	3: { die: "d10", traits: ["reach"], usage: "held-in-two-hands" },
};

const WEAPON_GROUPS = {
	slashing: "sword",
	piercing: "spear",
	bludgeoning: "club",
};

const WEAPON_TRAITS = ["grapple", "nonlethal", "shove", "trip", "modular"];

const WEAPON_DAMAGE_TYPES = Object.keys(WEAPON_GROUPS);

const WEAPON_RUNES = [
	"corrosive",
	"disrupting",
	"flaming",
	"frost",
	"shock",
	"thundering",
];

const WEAPON_GREATER_RUNES = [
	// "anarchic",
	// "axiomatic",
	"greaterCorrosive",
	"greaterDisrupting",
	"greaterFlaming",
	"greaterFrost",
	"greaterShock",
	"greaterThundering",
	"holy",
	"unholy",
];

export const mindSmith = {
	key: "mindsmith",
	item: {
		uuid: "Compendium.pf2e.feats-srd.Item.juikoiIA0Jy8PboY", // Mind Smith Dedication
	},
	children: [
		{
			slug: "weapon",
			uuid: MIND_WEAPON_UUID, // Mind Weapon
		},
		{
			slug: "mental",
			uuid: MALLEABLE_MENTAL_FORGE_UUID, // Malleable Mental Forge
		},
		{
			slug: "runic",
			uuid: "Compendium.pf2e.feats-srd.Item.2uQbQgz1AbjzcFSp", // Runic Mind Smithing
		},
		{
			slug: "advanced",
			uuid: "Compendium.pf2e.feats-srd.Item.fgnfXwFcn9jZlXGD", // Advanced Runic Mind Smithing
		},
	],
	rows: [
		{
			type: "alert",
			slug: "alert",
			message: () => localize("interface.alert.weapon"),
			fix,
			childPredicate: [{ not: "weapon" }],
		},
		{
			type: "select",
			slug: "smith",
			label: () => localize("label.mindsmith"),
			options: WEAPON_DAMAGE_TYPES,
			labelizer: ({ utils }) => utils.damageLabel,
			childPredicate: ["weapon"],
		},
		...[1, 2].map((nb) => ({
			type: "select",
			slug: `mental${nb}`,
			label: () => localize("label.mentalforge", { nb }),
			options: WEAPON_TRAITS,
			labelizer: ({ utils }) => utils.weaponTraitLabel,
			unique: "mental",
			childPredicate: ["weapon", "mental"],
		})),
		{
			type: "select",
			slug: "runic",
			label: () => localize("label.runicmind"),
			options: WEAPON_RUNES,
			labelizer: ({ utils }) => utils.weaponPropertyRunesLabel,
			childPredicate: ["weapon", "runic", { not: "advanced" }],
			condition: ({ children, utils }) =>
				utils.hasFreePropertySlot(children.weapon),
		},
		{
			type: "select",
			slug: "advanced",
			label: () => localize("label.runicmind"),
			options: WEAPON_GREATER_RUNES,
			labelizer: ({ utils }) => utils.weaponPropertyRunesLabel,
			childPredicate: ["weapon", "advanced"],
			condition: ({ children, utils }) =>
				utils.hasFreePropertySlot(children.weapon),
		},
	],
	process: ({ children, updateItem, fields, messages, item, utils }) => {
		const weapon = children.weapon;
		if (!weapon) return;

		messages.addGroup("mindsmith");

		const selected = fields.smith.value;
		updateItem({
			_id: weapon.id,
			"system.damage.damageType": selected,
			"system.group": WEAPON_GROUPS[selected],
		});
		messages.add("mindsmith", {
			selected: utils.damageLabel(selected),
			uuid: item.uuid,
			label: "mindsmith",
		});

		if (children.mental) {
			const traits = deepClone(weapon._source.system.traits?.value ?? []);

			for (const nb of [1, 2]) {
				const selected = fields[`mental${nb}`].value;
				if (!traits.includes(selected)) traits.push(selected);
				updateItem({ _id: weapon.id, "system.traits.value": traits });
				messages.add("mindsmith", {
					selected: utils.weaponTraitLabel(selected),
					uuid: children.mental.uuid,
					label: localize("label.mentalforge", { nb }),
				});
			}
		}

		if (
			(children.advanced || children.runic) &&
			utils.hasFreePropertySlot(weapon)
		) {
			const child = children.advanced ?? children.runic;
			const freeSlot = utils.getFreePropertyRuneSlot(weapon);
			const field = fields.advanced ?? fields.runic;
			const selected = field.value;

			if (freeSlot && !weapon.system.runes.property.includes(selected)) {
				updateItem({
					_id: weapon.id,
					[`system.${freeSlot}.value`]: selected,
					[`flags.${MODULE_ID}.runeSlot`]: freeSlot,
				});
				messages.add("mindsmith", {
					selected: utils.weaponPropertyRunesLabel(selected),
					uuid: child.uuid,
					label: "runicmind",
				});
			}
		}
	},
	rest: ({ item, sourceId, updateItem, actor }) => {
		if (sourceId !== MIND_WEAPON_UUID) return;

		const mental = findItemWithSourceId(actor, MALLEABLE_MENTAL_FORGE_UUID);
		if (mental) {
			let traits = item._source.system.traits?.value ?? [];
			traits = traits.filter((trait) => !WEAPON_TRAITS.includes(trait));
			updateItem({ _id: item.id, "system.traits.value": traits });
		}

		const runeSlot = getFlag(item, "runeSlot");
		if (runeSlot) {
			updateItem({
				_id: item.id,
				[`system.${runeSlot}.value`]: null,
				[`flags.${MODULE_ID}.-=runeSlot`]: true,
			});
		}
	},
};

async function fix({ actor }) {
	const localize = subLocalize("dialog.weapon");

	let content = localize("flavor");

	for (const key of ["0", "1", "2", "3"]) {
		const label = localize(`option.${key}`);
		content += `<label><input type="radio" name="type" value="${key}">${label}</label>`;
	}

	const weapon = await Dialog.wait(
		{
			title: localize("title"),
			content,
			buttons: {
				yes: {
					icon: '<i class="fas fa-save"></i>',
					label: localize("accept"),
					callback: onWeaponSelected,
				},
				no: {
					icon: '<i class="fas fa-times"></i>',
					label: localize("cancel"),
					callback: () => null,
				},
			},
			close: () => null,
		},
		{},
		{ id: "pf2e-dailies-weapon", width: 600 },
	);

	if (weapon) {
		await actor.createEmbeddedDocuments("Item", [weapon]);
		return true;
	}

	return false;
}

async function onWeaponSelected(html) {
	const localize = subLocalize("dialog.weapon");

	const selection = html.find("[name=type]:checked").val();
	if (!selection) {
		localize.warn("error.noSelection");
		return;
	}

	const weapon = (await fromUuid(MIND_WEAPON_UUID))?.toObject();
	if (!weapon) {
		localize.warn("error.missing");
		return;
	}

	const stats = WEAPON_BASE_TYPES[selection];

	setProperty(weapon, "system.damage.die", stats.die);
	setProperty(weapon, "system.traits.value", stats.traits.slice());
	setProperty(weapon, "system.usage.value", stats.usage);

	return weapon;
}
