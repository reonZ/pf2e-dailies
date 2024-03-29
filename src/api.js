import {
	capitalize,
	createConsumableFromSpell,
	getSetting,
	localize,
	ordinalString,
	sequenceArray,
} from "module-api";
import { canPrepDailies } from "./actor";
import { DailiesInterface } from "./apps/interface";

const halfLevelString = "max(1,floor(@actor.level/2))";

const RUNE_PROPERTY_KEYS = [
	"propertyRune1",
	"propertyRune2",
	"propertyRune3",
	"propertyRune4",
];

let SKILLNAMES;
let LANGUAGES;

export const utils = {
	// Skills
	get skillNames() {
		SKILLNAMES ??= Object.keys(CONFIG.PF2E.skillList).filter(
			(skill) => skill !== "lore",
		);
		return SKILLNAMES.slice();
	},
	skillLabel: (skill) => {
		return game.i18n.localize(CONFIG.PF2E.skillList[skill]);
	},
	createSkillRuleElement: ({ skill, value, mode = "upgrade", predicate }) => {
		const rule = {
			key: "ActiveEffectLike",
			mode,
			path: `system.skills.${skill}.rank`,
			value,
		};
		if (predicate?.length) rule.predicate = predicate;
		return rule;
	},
	createLoreSource: ({ name, rank }) => {
		const data = {
			type: "lore",
			img: "systems/pf2e/icons/default-icons/lore.svg",
			name,
			system: { proficient: { value: rank } },
		};
		return data;
	},
	getTranslatedSkills: (lowercase = false) => {
		return Object.entries(CONFIG.PF2E.skillList).reduce(
			(result, [key, value]) => {
				const localized = game.i18n.localize(value);
				result[key] = lowercase
					? localized.toLocaleLowerCase(game.i18n.lang)
					: localized;
				return result;
			},
			{},
		);
	},
	// Languages
	get languageNames() {
		LANGUAGES ??= Object.keys(CONFIG.PF2E.languages);
		return LANGUAGES.slice();
	},
	languageLabel: (language) => {
		return game.i18n.localize(CONFIG.PF2E.languages[language]);
	},
	createLanguageRuleElement: ({ language, mode = "add", predicate }) => {
		const rule = {
			key: "ActiveEffectLike",
			mode,
			path: "system.build.languages.granted",
			value: {
				slug: language,
				source: "{item|name}",
			},
		};
		if (predicate?.length) rule.predicate = predicate;
		return rule;
	},
	// resistances
	resistanceLabel: (resistance, value) => {
		let str = game.i18n.localize(`PF2E.Trait${capitalize(resistance)}`);
		if (value) str += ` ${value}`;
		return str;
	},
	createResistanceRuleElement: ({ type, value, predicate }) => {
		if (value === "half") value = halfLevelString;
		const rule = {
			key: "Resistance",
			type,
			value,
		};
		if (predicate?.length) rule.predicate = predicate;
		return rule;
	},
	// feats
	createFeatSource: async (uuid) => {
		const source = (await fromUuid(uuid))?.toObject();
		if (!source)
			throw new Error(
				`An error occured while trying to create a feat source with uuid: ${uuid}`,
			);
		return source;
	},
	// spells
	createSpellScrollSource: async (options) => {
		return createSpellConsumableSource("scroll", options);
	},
	createWandSource: async (options) => {
		return createSpellConsumableSource("wand", options);
	},
	createSpellSource: async (uuid) => {
		const source = (await fromUuid(uuid))?.toObject();
		if (!source)
			throw new Error(
				`An error occured while trying to create a spell source with uuid: ${uuid}`,
			);
		return source;
	},
	spellRankLabel: (rank) => {
		return game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", {
			rank: ordinalString(rank),
		});
	},
	// Rule Elements
	get halfLevelString() {
		return halfLevelString;
	},
	getChoiSetRuleSelection: (item, option) => {
		const rules = item._source.system.rules;
		const rule = rules.find(
			(rule) =>
				rule.key === "ChoiceSet" && (!option || rule.rollOption === option),
		);
		return rule?.selection;
	},
	//
	proficiencyLabel: (rank) => {
		return game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank]);
	},
	randomOption: async (options) => {
		const roll = (
			await new Roll(`1d${options.length}`).evaluate({ async: true })
		).total;
		const result = options[roll - 1];
		if (typeof result === "string") return result;
		return result.value;
	},
	halfLevelValue: (actor) => Math.max(1, Math.floor(actor.level / 2)),
	sequenceArray,
	// equipment
	damageLabel: (damage) => {
		return game.i18n.localize(CONFIG.PF2E.damageTypes[damage]);
	},
	weaponTraitLabel: (trait) => {
		return game.i18n.localize(CONFIG.PF2E.weaponTraits[trait]);
	},
	weaponPropertyRunesLabel: (rune) => {
		const key = `PF2E.WeaponPropertyRune.${rune}.Name`;
		return game.i18n.localize(key);
	},
	hasFreePropertySlot: (item) => {
		const potency = item.system.runes.potency;
		return potency > 0 && item.system.runes.property.length < potency;
	},
	getFreePropertyRuneSlot: (item) => {
		const potency = item.system.potencyRune.value;
		if (potency === null) return null;

		for (let i = 0; i < potency; i++) {
			const property = RUNE_PROPERTY_KEYS[i];
			if (!item.system[property].value) return property;
		}

		return null;
	},
	// actor
	getPlayersActors: (member, ...types) => {
		const actorTypes = types.length ? types : ["creature"];
		const memberIsActor = member instanceof Actor;

		let actors = game.actors;

		if (memberIsActor && member.parties.size && getSetting("members")) {
			actors = Array.from(member.parties ?? []).flatMap((p) => p.members);
			actors = Array.from(new Set(actors));
		} else {
			actors = actors.filter((a) => a.hasPlayerOwner);
		}

		return actors.filter(
			(a) => a.isOfType(...actorTypes) && (!memberIsActor || a !== member),
		);
	},
};

async function createSpellConsumableSource(
	type,
	{ uuid, level, itemName, itemImg },
) {
	const spell = await fromUuid(uuid);
	if (!spell) {
		throw new Error(
			`An error occured while trying to create a spell scroll source with uuid: ${uuid}`,
		);
	}
	return createConsumableFromSpell(spell, {
		type,
		heightenedLevel: level,
		temp: true,
		itemName,
		itemImg,
	});
}

export function openDailiesInterface(character, message) {
	let actor = character;

	if (!actor || !actor.isOfType("character") || !actor.isOwner) {
		const controlled = canvas.tokens.controlled;
		actor = controlled.find(
			(token) => token.actor?.isOfType("character") && token.actor.isOwner,
		)?.actor;
		if (!actor) actor = game.user.character;
	}

	if (!actor || !actor.isOfType("character") || !actor.isOwner)
		return warn("error.noCharacterSelected");

	if (!canPrepDailies(actor)) return warn("error.unrested");

	new DailiesInterface(
		actor,
		{
			title: localize("interface.title", { name: actor.name }),
		},
		message,
	).render(true);
}

export function createUpdateCollection() {
	const collection = new Collection();
	return [
		collection,
		(data) => {
			const id = data._id;
			if (!id) return;
			const update = collection.get(id) ?? {};
			collection.set(id, mergeObject(update, data));
		},
	];
}
