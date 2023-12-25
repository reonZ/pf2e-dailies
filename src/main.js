import { onPerformDailyCrafting, renderCharacterSheetPF2e } from "./actor";
import { openDailiesInterface, requestDailies, utils } from "./api";
import { DailyCustoms } from "./apps/custom";
import { renderChatMessage } from "./chat";
import {
	BUILTINS_DAILIES,
	CUSTOM_DAILIES,
	UNIQUE_DAILY_KEYS,
	checkCustomDaily,
	parseCustomDailies,
	prepareAllDailies,
	prepareDailies,
} from "./dailies";
import { RATION_UUID } from "./data/rations";
import {
	getSpellcastingEntryStaffData,
	getSpellcastingEntryStaffFlags,
	isPF2eStavesActive,
	updateEntryCharges,
} from "./data/staves";
import {
	MODULE_ID,
	getSetting,
	registerSetting,
	registerSettingMenu,
	warn,
} from "./module";
import { restForTheNight } from "./rest";
import { onSpellcastingEntryCast } from "./spellcasting";

export const EXT_VERSION = "1.3.0";

const SPELLCASTING_ENTRY_CAST =
	"CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.cast";
const DAILY_CRAFTING =
	"CONFIG.PF2E.Actor.documentClasses.character.prototype.performDailyCrafting";

Hooks.once("setup", () => {
	registerSetting({
		name: "customDailies",
		type: Array,
		default: [],
		config: false,
		onChange: parseCustomDailies,
	});

	registerSetting({
		name: "familiar",
		type: String,
		default: "",
	});

	registerSetting({
		name: "watch",
		type: Boolean,
		default: false,
		onChange: enableWatchHook,
	});

	registerSetting({
		name: "members",
		type: Boolean,
		default: true,
		scope: "client",
	});

	registerSetting({
		name: "staff-sort",
		tupe: String,
		default: "top",
		choices: ["top", "bottom"],
		scope: "client",
	});

	registerSetting({
		name: "filters",
		tupe: String,
		default: "",
		scope: "client",
		onChange: prepareAllDailies,
	});

	registerSettingMenu({
		name: "customs",
		type: DailyCustoms,
	});

	game.modules.get(MODULE_ID).api = {
		openDailiesInterface: (actor) => openDailiesInterface(actor),
		requestDailies,
		getBuiltinDailies: () => deepClone(BUILTINS_DAILIES),
		getCustomDailies: () => deepClone(CUSTOM_DAILIES),
		getBuiltinDailyKeys: () =>
			[
				UNIQUE_DAILY_KEYS.map((k) => `dailies.${k}`),
				BUILTINS_DAILIES.map((d) => `dailies.${d.key}`),
			].flat(),
		getBuiltinDailyKey: (uuid) => {
			if (uuid === RATION_UUID) return "dailies.rations";

			const daily = [BUILTINS_DAILIES, UNIQUE_DAILY_KEYS]
				.flat()
				.find(
					(d) =>
						d.item.uuid === uuid || d.children.some((c) => c.uuid === uuid),
				);
			if (daily) return;
			return `dailies.${daily.key}`;
		},
		prepareDailies,
		checkCustomDaily,
		getUtils: () => deepClone(utils),
		getSpellcastingEntryStaffFlags,
		getSpellcastingEntryStaffData,
		updateEntryCharges,
	};

	if (getSetting("watch")) enableWatchHook(true);

	if (!isPF2eStavesActive()) {
		CONFIG.PF2E.preparationType.charge = "Charge";
		libWrapper.register(
			MODULE_ID,
			SPELLCASTING_ENTRY_CAST,
			onSpellcastingEntryCast,
		);
	}
});

Hooks.once("ready", async () => {
	if (isPF2eStavesActive()) {
		warn("staves.conflict", true);
	}

	await prepareAllDailies();

	if (!game.modules.get("lib-wrapper")?.active && game.user.isGM) {
		warn("error.noLibwrapper", true);
		return;
	}

	libWrapper.register(
		MODULE_ID,
		DAILY_CRAFTING,
		onPerformDailyCrafting,
		"OVERRIDE",
	);
});

Hooks.on("pf2e.restForTheNight", restForTheNight);

Hooks.on("renderCharacterSheetPF2e", renderCharacterSheetPF2e);

function enableWatchHook(enabled) {
	Hooks[enabled ? "on" : "off"]("renderChatMessage", renderChatMessage);
}
