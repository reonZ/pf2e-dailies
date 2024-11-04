import { MODULE, getSetting, registerWrapper, warn } from "foundry-pf2e";
import {
    onCharacterPrepareData,
    onCharacterSheetGetData,
    onRenderCharacterSheetPF2e,
    onRenderFamiliarSheetPF2e,
    onRenderNPCSheetPF2e,
    performDailyCrafting,
} from "./actor";
import {
    canCastRank,
    canPrepareDailies,
    getAnimistConfigs,
    getDailiesSummary,
    getDisabledDailies,
    getStaffItem,
    openDailiesInterface,
    setStaffChargesValue,
} from "./api";
import { DAILY_SCHEMA, initDailies, registerCustomDailies } from "./dailies";
import { createLanguageDaily } from "./data/languages";
import { createResistanceDaily } from "./data/resistances";
import { createScrollChainDaily } from "./data/scrolls";
import { createComboSkillDaily, createLoreSkillDaily } from "./data/skills";
import { restForTheNight } from "./rest";
import { registerSettings } from "./settings";
import {
    spellcastingEntryConsume,
    spellcastingEntryGetSheetData,
    spellcastingEntryPrepareSiblingData,
} from "./spellcasting";
import { CustomDaily } from "./types";
import { utils } from "./utils";

MODULE.register("pf2e-dailies", "PF2e Dailies");

Hooks.once("init", () => {
    registerSettings();

    registerWrapper(
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareData",
        onCharacterPrepareData,
        "WRAPPER"
    );

    MODULE.current.api = {
        canCastRank,
        getStaffItem,
        setStaffChargesValue,
        openDailiesInterface,
        registerCustomDailies,
        getDailiesSummary,
        canPrepareDailies,
        getDisabledDailies,
        getAnimistConfigs,
        utils,
        dailyHelpers: {
            createComboSkillDaily,
            createLoreSkillDaily,
            createLanguageDaily,
            createResistanceDaily,
            createScrollChainDaily,
        },
    };

    CONFIG.PF2E.preparationType.charges = "Charges";

    registerWrapper(
        "CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.prepareSiblingData",
        spellcastingEntryPrepareSiblingData,
        "MIXED"
    );

    registerWrapper(
        "CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.consume",
        spellcastingEntryConsume,
        "MIXED"
    );

    registerWrapper(
        "CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.getSheetData",
        spellcastingEntryGetSheetData,
        "WRAPPER"
    );
});

Hooks.once("ready", () => {
    initDailies();

    registerWrapper("game.pf2e.actions.restForTheNight", restForTheNight, "WRAPPER");

    registerWrapper(
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.performDailyCrafting",
        performDailyCrafting,
        "OVERRIDE"
    );

    registerWrapper(
        "CONFIG.Actor.sheetClasses.character['pf2e.CharacterSheetPF2e'].cls.prototype.getData",
        onCharacterSheetGetData,
        "WRAPPER"
    );

    if (game.user.isGM) {
        const hasIncompatibleDailies = getSetting<CustomDaily[]>("customDailies").some((custom) =>
            foundry.utils.isNewerVersion(DAILY_SCHEMA, custom.schema ?? "")
        );
        if (hasIncompatibleDailies) {
            warn("error.incompatible", true);
        }
    }
});

Hooks.on("renderCharacterSheetPF2e", onRenderCharacterSheetPF2e);
Hooks.on("renderFamiliarSheetPF2e", onRenderFamiliarSheetPF2e);
Hooks.on("renderNPCSheetPF2e", onRenderNPCSheetPF2e);
