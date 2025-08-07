import {
    canPrepareDailies,
    getDailiesSummary,
    getDisabledDailies,
    onRenderCharacterSheetPF2e,
    onRenderFamiliarSheetPF2e,
    onRenderNPCSheetPF2e,
    openDailiesInterface,
} from "actor";
import { CustomDaily, registerCustomDailies } from "custom";
import { DAILY_SCHEMA, initializeDailies } from "dailies";
import {
    canCastRank,
    createComboSkillDaily,
    createLanguageDaily,
    createLoreSkillDaily,
    createResistanceDaily,
    createScrollChainDaily,
    getAnimistConfigs,
    getAnimistVesselsData,
    getStaffData,
    setStaffChargesValue,
} from "data";
import { CharacterPF2e, getSetting, MODULE, warning } from "module-helpers";
import { registerSettings } from "settings";
import { utils } from "utils";
import { registerInitWrappers, registerReadyWrappers } from "wrappers";

MODULE.register("pf2e-dailies");

Hooks.once("init", () => {
    registerSettings();
    registerInitWrappers();

    // @ts-expect-error
    CONFIG.PF2E.preparationType.charges = "Charges";
});

Hooks.once("ready", () => {
    initializeDailies();
    registerReadyWrappers();

    if (game.user.isGM) {
        const hasIncompatibleDailies = getSetting<CustomDaily[]>("customDailies").some((custom) =>
            foundry.utils.isNewerVersion(DAILY_SCHEMA, custom.schema ?? "")
        );
        if (hasIncompatibleDailies) {
            warning("error.incompatible", true);
        }
    }
});

Hooks.on("renderCharacterSheetPF2e", onRenderCharacterSheetPF2e);
Hooks.on("renderFamiliarSheetPF2e", onRenderFamiliarSheetPF2e);
Hooks.on("renderNPCSheetPF2e", onRenderNPCSheetPF2e);

MODULE.apiExpose({
    canCastRank,
    canPrepareDailies,
    getAnimistConfigs,
    getAnimistVesselsData,
    getDailiesSummary,
    getDisabledDailies,
    getStaffItem: (actor: CharacterPF2e) => {
        const flag = getStaffData(actor);
        return (flag && actor.inventory.get(flag.staffId)) || null;
    },
    openDailiesInterface,
    registerCustomDailies,
    setStaffChargesValue,
    utils,
    dailyHelpers: {
        createComboSkillDaily,
        createLoreSkillDaily,
        createLanguageDaily,
        createResistanceDaily,
        createScrollChainDaily,
    },
});
