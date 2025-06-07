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

Hooks.on("init", () => {
    registerSettings();
    registerInitWrappers();

    // @ts-expect-error
    CONFIG.PF2E.preparationType.charges = "Charges";
});

Hooks.on("ready", () => {
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
    getStaffItem: (actor: CharacterPF2e) => {
        const flag = getStaffData(actor);
        return (flag && actor.inventory.get(flag.staffId)) || null;
    },
    setStaffChargesValue,
    openDailiesInterface,
    registerCustomDailies,
    getDailiesSummary,
    canPrepareDailies,
    getDisabledDailies,
    getAnimistConfigs,
    getAnimistVesselsData,
    utils,
    dailyHelpers: {
        createComboSkillDaily,
        createLoreSkillDaily,
        createLanguageDaily,
        createResistanceDaily,
        createScrollChainDaily,
    },
});
