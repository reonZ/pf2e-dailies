import {
    MODULE,
    getSetting,
    registerSetting,
    registerSettingMenu,
    registerWrapper,
    renderCharacterSheet,
    warn,
} from "pf2e-api";
import {
    onCharacterPrepareData,
    onCharacterSheetGetData,
    onRenderCharacterSheetPF2e,
    onRenderFamiliarSheetPF2e,
    onRenderNPCSheetPF2e,
    performDailyCrafting,
} from "./actor";
import { CustomDailies } from "./apps/customs";
import { DAILY_SCHEMA, initDailies, parseDailies } from "./dailies";
import { restForTheNight } from "./rest";
import {
    spellcastingEntryConsume,
    spellcastingEntryGetSheetData,
    spellcastingEntryPrepareSiblingData,
} from "./spellcasting";
import { CustomDaily } from "./types";
import { canCastRank, setStaffChargesValue } from "./api";

MODULE.register("pf2e-dailies", "PF2e Dailies");

Hooks.once("init", () => {
    registerSetting({
        key: "customDailies",
        type: Array,
        default: [],
        config: false,
        onChange: parseDailies,
    });

    registerSettingMenu({
        key: "customs",
        type: CustomDailies,
    });

    registerSetting({
        key: "familiarAbilities",
        type: String,
        default: "",
    });

    registerSetting({
        key: "partyMembers",
        type: Boolean,
        default: true,
    });

    registerSetting({
        key: "addedHighlight",
        type: Boolean,
        default: true,
        scope: "client",
        onChange: () => renderCharacterSheet(),
    });

    registerWrapper(
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareData",
        onCharacterPrepareData,
        "WRAPPER"
    );

    MODULE.current.api = {
        canCastRank,
        setStaffChargesValue,
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
            isNewerVersion(DAILY_SCHEMA, custom.schema ?? "")
        );
        if (hasIncompatibleDailies) {
            warn("error.incompatible", true);
        }
    }
});

Hooks.on("renderCharacterSheetPF2e", onRenderCharacterSheetPF2e);
Hooks.on("renderFamiliarSheetPF2e", onRenderFamiliarSheetPF2e);
Hooks.on("renderNPCSheetPF2e", onRenderNPCSheetPF2e);
