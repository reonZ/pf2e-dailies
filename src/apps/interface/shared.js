import { sequenceArray } from "module-api";

export function getSimplifiableValue(actor, value, fallback) {
	if (value === undefined) return fallback;
	if (typeof value === "number") return value;
	if (value === "level") return actor.level;
	if (value === "half") return Math.max(1, Math.floor(actor.level / 2));
	const numbered = Number(value);
	return Number.isNaN(numbered) ? fallback : numbered;
}

export async function parseFilter(filter) {
	return {
		type: filter.type,
		search: await (filter.type === "feat"
			? parseFeatFilter(this.actor, filter.search)
			: parseSpellFilter(this.actor, filter.search)),
		drop: filter.drop,
	};
}

function checkFilter(selected, checkbox) {
	if (!selected?.length) return;

	checkbox.selected = selected;
	checkbox.isExpanded = true;

	for (const x of selected) {
		checkbox.options[x].selected = true;
	}
}

function setTraits(searchTraits, dataTraits) {
	const traits = getFilterTraits(searchTraits);
	if (traits?.selected.length) {
		dataTraits.conjunction = traits.conjunction;
		dataTraits.selected = traits.selected;
	}
}

export function getFilterTraits(traits) {
	if (!traits) return;

	const selected = Array.isArray(traits) ? traits : traits.selected;
	if (!selected?.length) return;

	return {
		selected: selected.map((x) => (typeof x === "string" ? { value: x } : x)),
		conjunction: (!Array.isArray(traits) && traits.conjunction) || "and",
	};
}

async function parseSpellFilter(actor, search) {
	const data = await game.pf2e.compendiumBrowser.tabs.spell.getFilterData();

	checkFilter(search.category, data.checkboxes.category);
	checkFilter(search.school, data.checkboxes.school);
	checkFilter(search.traditions, data.checkboxes.traditions);
	checkFilter(search.rarity, data.checkboxes.rarity);
	checkFilter(search.source, data.checkboxes.source);

	setTraits(search.traits, data.multiselects.traits);

	const level = getSpellFilterLevel(actor, search.level);
	if (level?.length) checkFilter(level, data.checkboxes.rank);

	return data;
}

async function parseFeatFilter(actor, search) {
	const data = await game.pf2e.compendiumBrowser.tabs.feat.getFilterData();

	checkFilter(search.category, data.checkboxes.category);
	checkFilter(search.skills, data.checkboxes.skills);
	checkFilter(search.rarity, data.checkboxes.rarity);
	checkFilter(search.source, data.checkboxes.source);

	setTraits(search.traits, data.multiselects.traits);

	const level = getFeatFilterLevel(actor, search.level);
	if (level) {
		data.sliders.level.values.min = level.min;
		data.sliders.level.values.max = level.max;
		data.sliders.level.isExpanded = true;
	}

	return data;
}

export function getSpellFilterLevel(actor, level) {
	if (Array.isArray(level)) return level;

	const simplified = getSimplifiableValue(actor, level);
	if (simplified) return sequenceArray(1, simplified);
}

export function getFeatFilterLevel(actor, level) {
	if (level === undefined) return;

	if (typeof level === "object") {
		return {
			min: getSimplifiableValue(actor, level.min, 0),
			max: getSimplifiableValue(actor, level.min, 20),
		};
	}

	return { min: 0, max: getSimplifiableValue(actor, level, 20) };
}
