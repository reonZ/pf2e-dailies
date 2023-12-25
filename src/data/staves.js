import { findItemWithSourceId, getFlag, setFlag } from "../module";
import {
	getValidSpellcastingList,
	getSpellcastingEntryMaxSlotRank,
	getBestSpellcastingEntry,
} from "../spellcasting";

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
			staffData.charges &&
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

	const entries = getValidSpellcastingList(actor);
	for (const entry of entries) {
		const entryMaxCharges = getSpellcastingEntryMaxSlotRank(entry);
		if (entryMaxCharges > maxCharges) maxCharges = entryMaxCharges;
	}

	const activation = findItemWithSourceId(actor, KINETIC_ACTIVATION, "feat");
	if (activation) {
		const classCharges = Math.ceil(actor.level / 2);
		if (classCharges > maxCharges) maxCharges = classCharges;
	}

	return maxCharges;
}

export function getBestSpellcastingEntryForStaves(actor) {
	const bestEntry = getBestSpellcastingEntry(actor);

	const activation = findItemWithSourceId(actor, KINETIC_ACTIVATION, "feat");
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
