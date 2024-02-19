import {
	AsyncFunction,
	error,
	getSetting,
	getSourceId,
	warn,
} from "module-api";
import { utils } from "./api";
import { tricksterAce } from "./data/ace";
import { bladeAlly } from "./data/blade";
import { ceremonialKnife } from "./data/ceremonial";
import { createScrollChain } from "./data/chain";
import { combatFlexibility } from "./data/flexibility";
import { createLanguageDaily } from "./data/language";
import { longevities } from "./data/longevity";
import { mindSmith } from "./data/mind";
import { rations } from "./data/rations";
import { createResistancelDaily } from "./data/resistance";
import { rootMagic } from "./data/root";
import { scrollSavant } from "./data/savant";
import { createTrainedLoreDaily, createTrainedSkillDaily } from "./data/skill";
import { spellshaping } from "./data/spellshaping";
import { thaumaturgeTome } from "./data/tome";

const DEPRECATED_CUSTOM_DAILIES = ["root-magic"];

export const UNIQUE_DAILY_KEYS = ["familiar", "staves"];

export const BUILTINS_DAILIES = [
	thaumaturgeTome,
	longevities,
	createTrainedSkillDaily(
		"ageless",
		"Compendium.pf2e.feats-srd.Item.wylnETwIz32Au46y",
	), // Ageless Spirit
	createTrainedSkillDaily(
		"memories",
		"Compendium.pf2e.feats-srd.Item.ptEOt3lqjxUnAW62",
	), // Ancient Memories
	createTrainedSkillDaily(
		"studies",
		"Compendium.pf2e.feats-srd.Item.9bgl6qYWKHzqWZj0",
	), // Flexible Studies
	createTrainedLoreDaily(
		"study",
		"Compendium.pf2e.feats-srd.Item.aLJsBBZzlUK3G8MW",
	), // Quick Study
	createLanguageDaily(
		"linguistics",
		"Compendium.pf2e.feats-srd.Item.eCWQU16hRLfN1KaX",
	), // Ancestral Linguistics
	createLanguageDaily(
		"borts",
		"Compendium.pf2e.equipment-srd.Item.iS7hAQMAaThHYE8g",
	), // Bort's Blessing
	createResistancelDaily(
		"elementalist",
		"Compendium.pf2e.feats-srd.Item.tx9pkrpmtqe4FnvS",
		["air", "earth", "fire", "water"],
		"half",
		"elementalist",
	), // Elementalist Dedication
	createResistancelDaily(
		"ganzi",
		"Compendium.pf2e.heritages.Item.3reGfXH0S82hM7Gp",
		["acid", "electricity", "sonic"],
		"half",
		"ganzi",
		true,
	), // Ganzi
	spellshaping,
	combatFlexibility,
	scrollSavant,
	createScrollChain("esoterica", [
		"Compendium.pf2e.feats-srd.Item.OqObuRB8oVSAEKFR", // Scroll Esoterica
		"Compendium.pf2e.feats-srd.Item.nWd7m0yRcIEVUy7O", // Elaborate Scroll Esoterica
		"Compendium.pf2e.feats-srd.Item.LHjPTV5vP3MOsPPJ", // Grand Scroll Esoterica
	]),
	createScrollChain("trickster", [
		"Compendium.pf2e.feats-srd.Item.ROAUR1GhC19Pjk9C", // Basic Scroll Cache
		"Compendium.pf2e.feats-srd.Item.UrOj9TROtn8nuxPf", // Expert Scroll Cache
		"Compendium.pf2e.feats-srd.Item.lIg5Gzz7W70jfbk1", // Master Scroll Cache
	]),
	tricksterAce(),
	mindSmith,
	bladeAlly,
	rootMagic,
	ceremonialKnife,
	rations,
];

export let DAILY_FILTERS = [];

let BUILTINS_UUIDS;
const UUIDS = new Map();

export function prepareDailies(dailies, prefix) {
	const uuids = new Map();

	for (const original of dailies) {
		const daily = deepClone(original);

		try {
			const keyWithPrefix = `${prefix}.${daily.key}`;
			if (DAILY_FILTERS.includes(keyWithPrefix)) continue;

			uuids.set(daily.item.uuid, { daily, condition: daily.item.condition });

			daily.key = keyWithPrefix;

			if (daily.children) {
				for (let i = 0; i < daily.children.length; i++) {
					const { uuid, condition } = daily.children[i];
					uuids.set(uuid, { daily, index: i, condition });
				}
			}
		} catch (err) {
			error("error.unexpected");
			console.error(err);
			console.error(
				`The error occured during data gathering of ${prefix}.${daily.key}`,
			);
		}
	}

	return uuids;
}

function prepareBaseDailies() {
	BUILTINS_UUIDS = prepareDailies(BUILTINS_DAILIES, "dailies");
}

export let CUSTOM_DAILIES = [];

export async function parseCustomDailies() {
	UUIDS.clear();

	CUSTOM_DAILIES = [];

	const customs = getSetting("customDailies");
	for (const { key, code } of customs) {
		try {
			const fn = new AsyncFunction(code);
			const daily = await fn();
			if (!checkCustomDaily(daily, true)) continue;
			CUSTOM_DAILIES.push(daily);
		} catch (err) {
			error("error.unexpected");
			console.error(err);
			console.error(
				`The error occured during call of custom function for ${key}`,
			);
		}
	}

	for (const [uuid, daily] of BUILTINS_UUIDS.entries()) {
		UUIDS.set(uuid, daily);
	}

	const CUSTOM_UUIDS = prepareDailies(CUSTOM_DAILIES, "custom");
	for (const [uuid, daily] of CUSTOM_UUIDS.entries()) {
		UUIDS.set(uuid, daily);
	}
}

function prepareDailyFilters() {
	const filters = getSetting("filters").trim();
	if (!filters) {
		DAILY_FILTERS = [];
	}

	try {
		DAILY_FILTERS = filters
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	} catch (err) {
		error("error.unexpected");
		console.error(err);
		console.error("The error occured while trying to parse the daily filters");
	}
}

export async function prepareAllDailies() {
	prepareDailyFilters();
	prepareBaseDailies();
	await parseCustomDailies();
}

export function checkCustomDaily(daily, warning = false) {
	if (!DEPRECATED_CUSTOM_DAILIES.includes(daily.key)) return true;
	if (warning && game.user.isGM)
		warn(
			"deprecated.custom.key",
			{ name: daily.label.trim() || daily.key },
			true,
		);
	return false;
}

export function getDailies(actor) {
	const dailies = {};

	for (const item of actor.items) {
		const sourceId = getSourceId(item);
		if (!sourceId || (item.isOfType("physical") && item.isInvested === false))
			continue;

		const entry = UUIDS.get(sourceId);
		if (!entry) continue;

		const { daily, index, condition } = entry;
		try {
			if (typeof condition === "function" && !condition({ actor, item, utils }))
				continue;

			dailies[daily.key] ??= deepClone(daily);

			if (index === undefined) dailies[daily.key].item = item;
			else dailies[daily.key].children[index].item = item;
		} catch (err) {
			error("error.unexpected");
			console.error(err);
			console.error(`The error occured during data gathering of ${daily.key}`);
		}
	}

	return Object.values(dailies).filter(
		(daily) => daily.item && daily.item instanceof Item,
	);
}

export function getDailyFromSourceId(sourceId) {
	return UUIDS.get(sourceId)?.daily;
}
