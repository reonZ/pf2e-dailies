import { createUpdateCollection } from "./api";
import { getDailyFromSourceId } from "./dailies";
import { isPF2eStavesActive } from "./data/staves";
import { MODULE, getFlag, getSourceId, setFlag, sluggify } from "module-api";

export async function restForTheNightAll(wrapped, ...args) {
	const messages = await wrapped(...args);
	await Promise.all(
		messages.map(async (message) => {
			const actor = message.actor;
			if (!actor?.isOwner) return;

			await onRestForTheNight(actor);
			await setFlag(actor, "rested", true);
			await setFlag(message, "prepared", false);
		}),
	);
	return messages;
}

async function onRestForTheNight(actor) {
	const removeItems = [];
	const [updateItems, updateItem] = createUpdateCollection();
	const pf2eStavesActive = isPF2eStavesActive();

	for (const item of actor.items) {
		if (getFlag(item, "temporary")) {
			removeItems.push(item.id);

			// we remove the itemGrants flag from the parent feat
			if (item.isOfType("feat")) {
				const parentId = getFlag(item, "grantedBy");
				if (parentId) {
					const slug = sluggify(item.name, { camel: "dromedary" });
					const path = `flags.pf2e.itemGrants.-=${slug}`;
					updateItem({ _id: parentId, [path]: true });
				}
			}

			// we don't need to do more work because the item is being deleted
			continue;
		}

		// we remove the spellcasting entries from pf2e staves
		if (
			!pf2eStavesActive &&
			item.isOfType("spellcastingEntry") &&
			item.system.prepared.value === "charge"
		) {
			removeItems.push(item.id);
			continue;
		}

		const sourceId = getSourceId(item);

		// We run the daily rest function if it exists
		if (sourceId) {
			const daily = getDailyFromSourceId(sourceId);
			if (daily?.rest) {
				await daily.rest({ item, sourceId, updateItem, actor });
			}
		}

		// we clean temporary rule elements
		const rules = deepClone(item._source.system.rules);
		let modifiedRules = false;
		for (let i = rules.length - 1; i >= 0; i--) {
			if (MODULE.id in rules[i]) {
				rules.splice(i, 1);
				modifiedRules = true;
			}
		}
		if (modifiedRules) updateItem({ _id: item.id, "system.rules": rules });
	}

	if (updateItems.size) {
		await actor.updateEmbeddedDocuments("Item", updateItems.contents);
	}

	if (removeItems.length) {
		await actor.deleteEmbeddedDocuments("Item", removeItems);
	}
}
