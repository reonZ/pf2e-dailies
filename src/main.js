import { performDailyCrafting, renderCharacterSheetPF2e } from "./actor";
import { openDailiesInterface, utils } from "./api";
import { DailyCustoms } from "./apps/custom";
import { preCreateChatMessage, renderChatMessage } from "./chat";
import {
	BUILTINS_DAILIES,
	CUSTOM_DAILIES,
	UNIQUE_DAILY_KEYS,
	checkCustomDaily,
	parseCustomDailies,
	prepareAllDailies,
	prepareDailies,
} from "./dailies";
import {
	DEFAULT_REGEX_RANKS,
	getSpellcastingEntryStaffData,
	getSpellcastingEntryStaffFlags,
	isPF2eStavesActive,
	updateEntryCharges,
} from "./data/staves";
import {
	MODULE_ID,
	registerSetting,
	registerSettingMenu,
	registerWrapper,
	warn,
} from "./module";
import { restForTheNightAll } from "./rest";
import { onSpellcastingEntryCast } from "./spellcasting";

export const EXT_VERSION = "1.3.0";

const SPELLCASTING_ENTRY_CAST =
	"CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.cast";
const DAILY_CRAFTING =
	"CONFIG.PF2E.Actor.documentClasses.character.prototype.performDailyCrafting";
const REST_FOR_THE_NIGHT = "game.pf2e.actions.restForTheNight";

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
		name: "members",
		type: Boolean,
		default: true,
		scope: "client",
	});

	registerSetting({
		name: "staff-sort",
		type: String,
		default: "top",
		choices: ["top", "bottom"],
		scope: "client",
	});

	registerSetting({
		name: "staff-regex",
		type: String,
		default: DEFAULT_REGEX_RANKS,
	});

	registerSetting({
		name: "filters",
		type: String,
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
		getBuiltinDailies: () => deepClone(BUILTINS_DAILIES),
		getCustomDailies: () => deepClone(CUSTOM_DAILIES),
		getBuiltinDailyKeys: () =>
			[
				UNIQUE_DAILY_KEYS.map((k) => `dailies.${k}`),
				BUILTINS_DAILIES.map((d) => `dailies.${d.key}`),
			].flat(),
		getBuiltinDailyKey: (uuid) => {
			const daily = BUILTINS_DAILIES.find(
				(d) => d.item.uuid === uuid || d.children?.some((c) => c.uuid === uuid),
			);
			if (!daily) return;
			return `dailies.${daily.key}`;
		},
		prepareDailies,
		checkCustomDaily,
		getUtils: () => deepClone(utils),
		getSpellcastingEntryStaffFlags,
		getSpellcastingEntryStaffData,
		updateEntryCharges,
	};

	if (!isPF2eStavesActive()) {
		CONFIG.PF2E.preparationType.charge = "Charge";
		registerWrapper(SPELLCASTING_ENTRY_CAST, onSpellcastingEntryCast, "MIXED");
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

	registerWrapper(DAILY_CRAFTING, performDailyCrafting, "OVERRIDE");

	registerWrapper(REST_FOR_THE_NIGHT, restForTheNightAll);
});

Hooks.on("renderCharacterSheetPF2e", renderCharacterSheetPF2e);

Hooks.on("preCreateChatMessage", preCreateChatMessage);
Hooks.on("renderChatMessage", renderChatMessage);
