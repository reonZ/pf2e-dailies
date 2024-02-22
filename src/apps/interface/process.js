import {
	MODULE,
	createFancyLink,
	error,
	getFlag,
	getSetting,
	hasLocalization,
	localize,
	sluggify,
	subLocalize,
} from "module-api";
import { createUpdateCollection, utils } from "../../api";
import { familiarUUID, getFamiliarPack } from "../../data/familiar";
import {
	DEFAULT_REGEX_RANKS,
	getBestSpellcastingEntryForStaves,
	getMaxSlotRankForStaves,
} from "../../data/staves";
import { getSpellcastingEntriesSortBounds } from "../../spellcasting";

export async function processData() {
	const actor = this.actor;
	const dailies = this.dailies;
	const fields = getFields.call(this);
	const addItems = [];
	const addRules = new Map();
	const [updateItems, updateItem] = createUpdateCollection();
	const flags = {};
	const msg = subLocalize("message");

	let addedSpells = false;
	let chatContent = "";

	const getRules = (item) => {
		const id = item.id;
		const existing = addRules.get(id);
		if (existing) return existing;

		const rules = deepClone(item._source.system.rules);

		for (let i = rules.length - 1; i >= 0; i--) {
			if (MODULE.id in rules[i]) rules.splice(i, 1);
		}

		addRules.set(id, rules);
		return rules;
	};

	const messages = {
		languages: { order: 80, messages: [] },
		skills: { order: 70, messages: [] },
		resistances: { order: 60, messages: [] },
		feats: { order: 50, messages: [] },
		spells: { order: 40, messages: [] },
		scrolls: { order: 30, messages: [] },
	};

	const rawMessages = [];

	const messageObj = {
		add: (group, options) => {
			messages[group] ??= { order: 0, messages: [] };
			messages[group].messages.push(options);
		},
		addGroup: (group, order, label) => {
			messages[group] ??= { label, order: order ?? 1, messages: [] };
		},
		addRaw: (message, order = 1) => {
			rawMessages.push({ order, message });
		},
	};

	if (actor.familiar && fields["dailies.familiar"]) {
		const familiar = actor.familiar;
		const pack = getFamiliarPack();
		const abilities = [];

		// we remove old abilities
		const ids = familiar.itemTypes.action.map((item) => item.id);
		if (ids.length) familiar.deleteEmbeddedDocuments("Item", ids);

		messageObj.addGroup("familiar", 20);

		for (const field of Object.values(fields["dailies.familiar"])) {
			const value = field.value;
			const isCustom = value.includes(".");
			const item = await (isCustom ? fromUuid(value) : pack.getDocument(value));
			if (!item || !item.isOfType("action")) continue;

			const source = item.toObject();
			if (source) {
				abilities.push(source);
				messageObj.add("familiar", {
					uuid: isCustom ? value : familiarUUID(value),
				});
			}
		}

		if (abilities.length) familiar.createEmbeddedDocuments("Item", abilities);
	}

	if (fields["dailies.staff"]) {
		const staffField = fields["dailies.staff"];
		const staffID = staffField.staffID.value;
		const staff = actor.items.get(staffID);
		const makeshift = staffField.staffID.makeshift === "true";
		const maxStaffCharges = getMaxSlotRankForStaves(actor);

		if (staff && (maxStaffCharges || makeshift)) {
			const uuids = [];
			const ranks = getSetting("staff-regex").trim() || DEFAULT_REGEX_RANKS;
			const ranksRegex = new RegExp(
				`<strong>\\s*(?<rank>(?:${ranks}))\\s*<\/strong>.+?(?<uuids>@(?:UUID|Compendium)\[[a-zA-Z0-9-.]+\].+?)\n`,
				"gi",
			);

			let rankMatch = ranksRegex.exec(staff.description);
			while (rankMatch !== null) {
				const rankStr = rankMatch.groups.rank.trim().replace(/\D+/, "") || "0";
				const rank = Math.clamped(parseInt(rankStr), 0, 10);
				const uuidRegex =
					/@(?<protocole>UUID|Compendium)\[(?<uuid>[a-zA-Z0-9-.]+)\]/g;

				let uuidMatch = uuidRegex.exec(rankMatch.groups.uuids);
				while (uuidMatch !== null) {
					let uuid = uuidMatch.groups.uuid;
					if (uuidMatch.groups.protocole === "Compendium") {
						if (!uuid.startsWith("Compendium.")) uuid = `Compendium.${uuid}`;
					}
					if (fromUuidSync(uuid)) {
						uuids.push({ rank, uuid });
					}
					uuidMatch = uuidRegex.exec(rankMatch.groups.uuids);
				}

				rankMatch = ranksRegex.exec(staff.description);
			}

			if (uuids.length) {
				let overcharge = 0;

				const expendedSpells = [];
				const expendedSlots = makeshift ? [1, 2, 3] : [1];
				const flexibleLabel = localize("interface.staves.flexible");
				const emptyLabel = localize("interface.staves.empty");
				const slotsUpdates = {};

				for (const i of expendedSlots) {
					const expendField = staffField[`expend${i}`];
					const data = expendField?.optionData;
					if (!data) continue;

					const entryId = data.entry;
					const entry = actor.items.get(entryId);
					if (!entry) continue;

					const rank = Number(data.rank);
					const slot = entry._source.system.slots[`slot${rank}`];

					if (data.type === "spell") {
						const prepared = deepClone(slot.prepared);
						const preparedSlot = prepared[data.index];
						if (slot.max < 1 || preparedSlot.expended) return;

						overcharge += rank;

						preparedSlot.expended = true;

						updateItem({
							_id: entryId,
							[`system.slots.slot${rank}.prepared`]: prepared,
						});

						const spell = actor.items.get(preparedSlot.id);
						expendedSpells.push({
							uuid: spell?.uuid,
							name: spell?.name ?? emptyLabel,
							rank,
						});
					} else {
						if (slot.max < 1 || slot.value < 1) continue;

						slotsUpdates[entryId] ??= {};
						slotsUpdates[entryId][rank] ??= slot.value;

						const currentValue = slotsUpdates[entryId][rank];

						if (currentValue < 1) continue;

						overcharge += rank;

						updateItem({
							_id: entryId,
							[`system.slots.slot${rank}.value`]: currentValue - 1,
						});

						slotsUpdates[entryId][rank] -= 1;

						expendedSpells.push({
							name: flexibleLabel,
							rank,
						});
					}
				}

				const bestEntry = getBestSpellcastingEntryForStaves(actor);

				if (bestEntry) {
					const { ability, tradition, proficiency } = bestEntry;

					const sort = (() => {
						const { min, max } = getSpellcastingEntriesSortBounds(actor);
						return getSetting("staff-sort") === "bottom"
							? max + 10000
							: min - 10000;
					})();

					const entrySource = {
						type: "spellcastingEntry",
						name: staff.name,
						sort,
						system: {
							ability,
							prepared: { value: "charge" },
							showSlotlessLevels: { value: false },
							showUnpreparedSpells: { value: false },
							proficiency,
							tradition,
						},
						flags: {
							[MODULE.id]: {
								type: "staff",
								staff: {
									charges: maxStaffCharges + overcharge,
									staveID: staffID,
									overcharge,
									makeshift,
								},
							},
						},
					};

					addItems.push(entrySource);

					await Promise.all(
						uuids.map(async ({ rank, uuid }) => {
							const source = await utils.createSpellSource(uuid);
							setProperty(source, `flags.${MODULE.id}.entry`, {
								level: rank,
								type: "staff",
							});
							addItems.push(source);
						}),
					);

					messageObj.addGroup(
						"staff",
						45,
						localize(
							`staves.message.${overcharge ? "withExpend" : "noExpend"}`,
							{
								makeshift: makeshift ? localize("staves.makeshift") : "",
							},
						),
					);
					messageObj.add("staff", { uuid: staff.uuid });
					for (const { uuid, name, rank } of expendedSpells) {
						const rankLabel = utils.spellRankLabel(rank);
						const label = `${name} (${rankLabel})`;

						messageObj.add("staff", {
							uuid,
							label: uuid
								? label
								: `<span class="fake-link">
									<i class='fa-solid fa-sparkles'></i>
									${label}
								</span>`,
						});
					}
				}
			}
		}
	}

	for (const { item, key, process } of dailies) {
		if (!fields[key]) continue;

		const dailyArgs = this.dailyArgs[key];

		try {
			await process({
				...dailyArgs,
				fields: fields[key],
				messages: messageObj,
				addItem: (source) => addItems.push(source),
				updateItem,
				removeRule: (signature, parent) => {
					const rules = getRules(parent ?? item);
					for (let i = rules.length - 1; i >= 0; i--) {
						const rule = rules[i];
						if (signature(rule)) {
							rules.splice(i, 1);
						}
					}
				},
				addRule: (source, parent) => {
					source[MODULE.id] = true;
					getRules(parent ?? item).push(source);
				},
				addFeat: (source, parent) => {
					const parentItem = parent ?? item;
					if (parentItem.isOfType("feat")) {
						const parentId = parentItem.id;
						setProperty(source, "flags.pf2e.grantedBy", {
							id: parentId,
							onDelete: "cascade",
						});
						setProperty(source, `flags.${MODULE.id}.grantedBy`, parentId);
					}
					addItems.push(source);
				},
				addSpell: (source, level) => {
					setProperty(source, `flags.${MODULE.id}.entry`, {
						level: level,
						type: "fallback",
					});
					addItems.push(source);
					addedSpells = true;
				},
			});
		} catch (err) {
			error("error.unexpected");
			console.error(err);
			console.error(`The error occured during processing of ${key}`);
		}
	}

	for (const [key, rowFields] of Object.entries(fields)) {
		const rows = this.rows[key];
		if (!rows) continue;

		for (const { row, type, input, value, uuid } of Object.values(rowFields)) {
			if (type === "random" || rows[row]?.save === false) continue;

			flags[key] ??= {};
			const flag = flags[key];

			if (type === "combo") {
				flag[row] = { input: input === "true", selected: value };
			} else if (type === "drop") {
				flag[row] = { uuid: uuid, name: value };
			} else {
				flag[row] = value;
			}
		}
	}

	for (const [id, rules] of addRules) {
		updateItem({ _id: id, "system.rules": rules });
	}

	if (addedSpells) {
		const entrySource = {
			type: "spellcastingEntry",
			name: localize("spellEntry.name"),
			system: {
				prepared: { value: "innate" },
				showSlotlessLevels: { value: false },
				showUnpreparedSpells: { value: false },
				proficiency: {
					value: 1,
					slug: actor.classDC?.slug || actor.class?.slug || undefined,
				},
			},
			flags: {
				[MODULE.id]: {
					type: "fallback",
				},
			},
		};
		addItems.push(entrySource);
	}

	for (const source of addItems) {
		const alreadyTemp = getProperty(source, "system.temporary") === true;
		if (!alreadyTemp) setProperty(source, `flags.${MODULE.id}.temporary`, true);
	}

	if (addItems.length) {
		const items = await actor.createEmbeddedDocuments("Item", addItems);

		for (const item of items) {
			if (item.isOfType("feat")) {
				// we add itemGrants flag to the parent feat to have the cascade effect in the tab
				const parentId = getFlag(item, "grantedBy");
				if (parentId) {
					const slug = sluggify(item.name, { camel: "dromedary" });
					const path = `flags.pf2e.itemGrants.${slug}`;
					updateItem({
						_id: parentId,
						[path]: { id: item.id, onDelete: "detach" },
					});
				}
			} else if (item.isOfType("spellcastingEntry")) {
				// we add all the newly created spells with 'addSpell' to this spellcasting entry
				const entryType = getFlag(item, "type");
				const spells = items.filter(
					(item) =>
						item.isOfType("spell") &&
						getFlag(item, "entry")?.type === entryType,
				);
				for (const spell of spells) {
					const { level } = getFlag(spell, "entry");
					const data = { _id: spell.id, "system.location.value": item.id };
					if (level !== undefined)
						data["system.location.heightenedLevel"] = level;
					updateItem(data);
				}
			}
		}
	}

	await actor.update({
		[`flags.${MODULE.id}`]: { ...expandObject(flags), rested: false },
	});

	if (updateItems.size)
		await actor.updateEmbeddedDocuments("Item", updateItems.contents);

	rawMessages.sort((a, b) => b.order - a.order);
	for (const { message } of rawMessages) {
		chatContent += `${message}<hr />`;
	}

	chatContent += await parseMessages(messages, chatContent);
	chatContent = chatContent
		? `${msg("changes")}<hr />${chatContent}`
		: msg("noChanges");

	ChatMessage.create({
		content: `<div class="pf2e-dailies-summary">${chatContent}</div>`,
		speaker: ChatMessage.getSpeaker({ actor }),
	});
}

async function parseMessages(messages) {
	const msg = subLocalize("message");

	const messageList = Object.entries(messages).map(([type, options]) => {
		options.label ??= msg.has(type) ? msg(type) : msg("gained", { type });
		return options;
	});
	messageList.sort((a, b) => b.order - a.order);

	let message = "";

	for (const { label, messages } of messageList) {
		if (!messages.length) continue;

		if (message) message += "<hr />";

		if (label) message += `<p><strong>${label}</strong></p>`;

		for (let { uuid, selected, label, random } of messages) {
			const key = `label.${label}`;
			label = label && hasLocalization(key) ? localize(key) : label || "";

			message += "<p>";
			message += uuid
				? `${await createFancyLink(uuid, { label })}`
				: ` ${label}`;
			if (selected) {
				message += `<i class="fa-solid fa-caret-right"></i>${selected}`;
			}
			if (random) {
				message += '<i class="fa-solid fa-dice-d20"></i>';
			}
			message += "</p>";
		}
	}

	return message;
}

function getFields() {
	const elements = this.element
		.find(".window-content .content")
		.find("input:not(.alert), select[data-type]")
		.toArray();

	const fields = {};

	for (const element of elements) {
		const field = {
			...element.dataset,
			value: element.value,
		};

		if (field.type === "combo" && field.input === "false") {
			const select = element.previousElementSibling;
			field.value = select.value;
			field.optionData = select.selectedOptions[0].dataset;
		}

		if (field.type === "select") {
			field.optionData = element.selectedOptions[0].dataset;
		}

		fields[field.daily] ??= {};
		fields[field.daily][field.row] = field;
	}

	return fields;
}
