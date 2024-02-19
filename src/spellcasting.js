import { MODULE, getFlag, localize, render, warn } from "module-api";
import { utils } from "./api";
import { getSpellcastingEntryStaffFlags } from "./data/staves";

export async function onSpellcastingEntryCast(wrapped, ...args) {
	const [spell, { rank }] = args;
	if (spell.isCantrip) return wrapped(...args);

	const staffFlags = getSpellcastingEntryStaffFlags(this);
	if (!staffFlags) return wrapped(...args);

	const actor = this.actor;
	const staff = actor.items.get(staffFlags.staveID);
	if (!staff?.isEquipped) {
		warn("staves.noStaff");
		return;
	}

	const castRank = spell.computeCastRank(rank);

	if (!rank || rank === "0") {
		return spell.toMessage(undefined, { data: { castRank } });
	}

	if (
		staffFlags.charges < 1 ||
		(staffFlags.charges < castRank && staffFlags.overcharge)
	) {
		warn("staves.noCharge");
		return;
	}

	const updates = [];

	if (!staffFlags.overcharge) {
		const spontaneousEntries = actor.spellcasting.filter(
			(entry) =>
				entry.isSpontaneous && entry.system.slots[`slot${castRank}`].value,
		);

		let useSpontaneous = false;

		const entryRankValue = (entry) =>
			entry.system.slots[`slot${castRank}`].value;

		if (spontaneousEntries.length === 1) {
			const entry = spontaneousEntries[0];

			const content = localize("staves.spontaneous.one", {
				rank: utils.spellRankLabel(castRank),
				entry: entry.name,
				remaining: entryRankValue(entry),
			});

			useSpontaneous = await Dialog.confirm({
				title: localize("staves.spontaneous.title"),
				defaultYes: false,
				content: `<div class="pf2e-dailies-spontaneous">${content}</div>`,
			});

			if (useSpontaneous) useSpontaneous = 0;
		} else if (spontaneousEntries.length > 1) {
			const entries = spontaneousEntries.map((entry, index) => ({
				index,
				name: entry.name,
				remaining: entryRankValue(entry),
			}));

			const content = await render("staves-spontaneous", {
				entries,
				castRank: utils.spellRankLabel(castRank),
				i18n: (key, { hash }) => localize(`staves.spontaneous.${key}`, hash),
			});

			useSpontaneous = await Dialog.wait({
				title: localize("staves.spontaneous.title"),
				content,
				buttons: {
					yes: {
						icon: '<i class="fas fa-check"></i>',
						label: game.i18n.localize("Yes"),
						callback: (html) => {
							const value = html.find("input[name=entry]:checked").val();
							return Number(value);
						},
					},
					no: {
						icon: '<i class="fas fa-times"></i>',
						label: game.i18n.localize("No"),
						callback: () => false,
					},
				},
				close: () => null,
			});
		}

		if (useSpontaneous === null) {
			return;
		}

		if (typeof useSpontaneous === "number") {
			const entry = spontaneousEntries[useSpontaneous];
			const current = entry.system.slots[`slot${castRank}`].value;

			updates.push({
				_id: entry.id,
				[`system.slots.slot${castRank}.value`]: current - 1,
			});

			staffFlags.charges -= 1;
		}
	}

	if (!updates.length) {
		if (staffFlags.charges < castRank) {
			warn("staves.noCharge");
			return;
		}

		staffFlags.charges -= castRank;
	}

	updates.push({ _id: this.id, [`flags.${MODULE.id}.staff`]: staffFlags });

	await actor.updateEmbeddedDocuments("Item", updates);
	await spell.toMessage(undefined, { data: { castRank } });
}

export function getValidSpellcastingList(
	actor,
	{ itemOnly, innate, focus } = {},
) {
	return actor.spellcasting.regular.filter((entry) => {
		if (entry.flags?.["pf2e-staves"] || getFlag(entry, "staff")) return false;

		if (!innate && entry.isInnate) return false;
		if (!focus && entry.isFocusPool) return false;

		if (entry.system.prepared.value === "items") {
			if (!itemOnly) return false;
			if (
				itemOnly === "scroll" &&
				entry.system.prepared.validItems !== "scroll"
			)
				return false;
		}

		return true;
	});
}

export function getSpellcastingEntryMaxSlotRank(entry) {
	let maxSlot = 0;

	if (entry.system.prepared.value === "items") {
		const levelMaxSlot = Math.ceil(entry.actor.level / 2);
		if (levelMaxSlot > maxSlot) maxSlot = levelMaxSlot;
	} else {
		for (let i = 0; i <= 10; i++) {
			const slot = entry.system.slots[`slot${i}`];
			if (slot.max) maxSlot = Math.max(maxSlot, i);
		}
	}

	return maxSlot;
}

export function getNotExpendedPreparedSpellSlot(spell, rank) {
	const entry = spell.spellcasting;
	const entries = Object.entries(
		entry.system.slots[`slot${rank ?? spell.rank}`].prepared,
	);
	const prepared = entries.find(
		([_, { id, expended }]) => id === spell.id && expended !== true,
	);
	if (!prepared) return;

	return {
		slotIndex: prepared[0],
		entry,
	};
}

export function getBestSpellcastingEntry(actor) {
	const entries = getValidSpellcastingList(actor);

	let bestMod = 0;
	let bestEntries = [];

	for (const entry of entries) {
		const mod = entry.statistic.mod;
		if (mod > bestMod) {
			bestEntries = [entry];
			bestMod = mod;
		} else if (mod === bestMod) {
			bestEntries.push(entry);
		}
	}

	if (bestEntries.length === 0) return;

	const returnedEntry = (entry) => {
		const { ability, tradition, proficiency } = entry.system;
		return { ability, tradition, proficiency, mod: bestMod };
	};

	if (bestEntries.length === 1) return returnedEntry(bestEntries[0]);

	const classAttr = actor.classDC.attribute;
	const classAttrEntries = bestEntries.filter(
		(entry) => entry.attribute === classAttr,
	);

	if (classAttrEntries === 1) return returnedEntry(classAttrEntries[0]);

	let bestCount = 0;
	let bestEntry;

	for (const entry of bestEntries) {
		const entryCount = getPreparedCount(entry);
		if (entryCount > bestCount) {
			bestCount = entryCount;
			bestEntry = entry;
		}
	}

	return returnedEntry(bestEntry ?? bestEntries[0]);
}

function getPreparedCount(entry) {
	if (entry.isSpontaneous) return entry.spells.size;

	if (entry.isPrepared) {
		const slots = Object.values(entry.system.slots);
		const prepared = slots.flatMap((slot) => Object.values(slot.prepared));
		return prepared.filter((spell) => spell.id).length;
	}

	return 0;
}

export function getSpellcastingEntriesSortBounds(actor) {
	let min = 0;
	let max = 0;

	for (const entry of actor.spellcasting) {
		if (entry.sort > max) max = entry.sort;
		else if (entry.sort < min) min = entry.sort;
	}

	return { min, max };
}
