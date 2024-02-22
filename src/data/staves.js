import { getFlag, getItemWithSourceId, setFlag } from "module-api";
import {
	getValidSpellcastingList,
	getSpellcastingEntryMaxSlotRank,
	getBestSpellcastingEntry,
} from "../spellcasting";

export const DEFAULT_REGEX_RANKS = [
	"cantrips?",
	"1st",
	"2nd",
	"3rd",
	"4th",
	"5th",
	"6th",
	"7th",
	"8th",
	"9th",
	"10th",
].join("|");

const KINETIC_ACTIVATION = "Compendium.pf2e.feats-srd.Item.NV9H39kbkbjhAK6X";

export function isPF2eStavesActive() {
	return game.modules.get("pf2e-staves")?.active;
}

export function getSpellcastingEntryStaffFlags(entry) {
	if (!entry) return;

	const data =
		getFlag(entry, "staff") ?? getProperty(entry, "flags.pf2e-staves");
	if (!data) return;

	// biome-ignore lint/performance/noDelete: not master of the returned data object
	delete data.prevDescription;
	return deepClone(data);
}

export function getSpellcastingEntryStaffData(entry) {
	const staffData = getSpellcastingEntryStaffFlags(entry);
	if (!staffData) return;

	staffData.overcharge ??= 0;
	staffData.max = getMaxSlotRankForStaves(entry.actor) + staffData.overcharge;

	const spontaneousCharges = (() => {
		const actor = entry.actor;
		if (
			!staffData.charges ||
			staffData.overcharge ||
			staffData.makeshift ||
			!actor
		)
			return {};

		return actor.spellcasting
			.filter((entry) => entry.isSpontaneous)
			.reduce((charges, entry) => {
				for (let i = 1; i <= 10; i++) {
					const slot = entry.system.slots[`slot${i}`];
					if (slot.max && slot.value) charges[i] = true;
				}
				return charges;
			}, {});
	})();

	staffData.canPayCost = (cost) => {
		return (
			!!staffData.charges &&
			(cost <= staffData.charges || spontaneousCharges[cost])
		);
	};

	return staffData;
}

export async function updateEntryCharges(entry, value) {
	const staffData = getSpellcastingEntryStaffData(entry);
	if (!staffData) return;

	const updatedValue = Math.clamped(value, 0, staffData.max);

	if (updatedValue !== staffData.charges) {
		staffData.charges = updatedValue;
		return setFlag(entry, "staff", staffData);
	}
}

export function getStaves(actor) {
	return [
		{ type: "weapon", trait: "magical" },
		{ type: "equipment", trait: "coda" },
	].flatMap(({ type, trait }) =>
		actor.itemTypes[type].filter((item) => {
			const traits = item.system.traits?.value;
			return traits?.includes("staff") && traits.includes(trait);
		}),
	);
}

export function getMaxSlotRankForStaves(actor) {
	let maxCharges = 0;
	const actorCharges = Math.ceil(actor.level / 2);

	const entries = getValidSpellcastingList(actor);
	for (const entry of entries) {
		const entryMaxCharges = getSpellcastingEntryMaxSlotRank(entry);
		if (entryMaxCharges > maxCharges) maxCharges = entryMaxCharges;
	}

	const activation = getItemWithSourceId(actor, KINETIC_ACTIVATION, "feat");
	if (activation) {
		if (actorCharges > maxCharges) maxCharges = actorCharges;
	}

	return Math.min(actorCharges, maxCharges);
}

export function getBestSpellcastingEntryForStaves(actor) {
	const bestEntry = getBestSpellcastingEntry(actor);

	const activation = getItemWithSourceId(actor, KINETIC_ACTIVATION, "feat");
	if (activation) {
		const bestMod = bestEntry?.mod ?? 0;
		const classDC =
			actor.classDCs.kineticist ?? actor.classDCs.find((c) => c.mod >= bestMod);
		const classMod = classDC.mod;

		if (classMod >= bestMod) {
			return {
				ability: { value: classDC.attribute },
				tradition: { value: "primal" },
				proficiency: { value: classDC.rank, slug: classDC.slug },
				mod: classMod,
			};
		}
	}

	return bestEntry;
}

export function getPreparedSpellcastingEntriesForStaves(actor) {
	const entryGroups = {};

	for (const entry of actor.spellcasting.filter((entry) => entry.isPrepared)) {
		const entryId = entry.id;
		const isFlexible = entry.isFlexible;

		for (let rank = 1; rank <= 10; rank++) {
			const data = entry.system.slots[`slot${rank}`];
			if (data.max < 1) continue;

			if (isFlexible) {
				if (data.value < 1) continue;

				entryGroups[entryId] ??= {
					id: entryId,
					name: entry.name,
					slots: [],
				};

				entryGroups[entryId].slots.push({
					rank,
					value: data.value,
					max: data.max,
				});
			} else {
				for (const [index, { id, prepared, expended }] of Object.entries(
					data.prepared,
				)) {
					if (prepared === false || expended) continue;

					const spell = entry.spells.get(id);

					entryGroups[entryId] ??= {
						id: entryId,
						name: entry.name,
						spells: [],
					};

					entryGroups[entryId].spells.push({
						name: spell?.name ?? "Empty Slot",
						rank,
						index,
					});
				}
			}
		}

		entryGroups[entryId]?.spells?.sort((a, b) => a.rank - b.rank);
	}

	return Object.values(entryGroups);
}
