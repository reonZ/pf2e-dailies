import {
    canPrepareDailies,
    createRetrainBtn,
    getDailiesSummary,
    getDisabledDailies,
    onRenderCharacterSheetPF2e,
    onRenderFamiliarSheetPF2e,
    onRenderNPCSheetPF2e,
    openDailiesInterface,
    retrain,
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
    getCommanderTactics,
    getSpells,
    getStaffData,
    isTacticAbility,
    setStaffChargesValue,
} from "data";
import { ActorPF2e, CharacterPF2e, getSetting, htmlClosest, localize, MODULE } from "foundry-helpers";
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
            foundry.utils.isNewerVersion(DAILY_SCHEMA, custom.schema ?? ""),
        );
        if (hasIncompatibleDailies) {
            localize.warning("error.incompatible", true);
        }
    }
});

Hooks.on("renderCharacterSheetPF2e", onRenderCharacterSheetPF2e);
Hooks.on("renderFamiliarSheetPF2e", onRenderFamiliarSheetPF2e);
Hooks.on("renderNPCSheetPF2e", onRenderNPCSheetPF2e);

MODULE.apiExpose("canCastRank", canCastRank);
MODULE.apiExpose("canPrepareDailies", canPrepareDailies);
MODULE.apiExpose("createRetrainBtn", createRetrainBtn);
MODULE.apiExpose("getAnimistConfigs", getAnimistConfigs);
MODULE.apiExpose("getAnimistVesselsData", getAnimistVesselsData);
MODULE.apiExpose("getCommanderTactics", getCommanderTactics);
MODULE.apiExpose("getDailiesSummary", getDailiesSummary);
MODULE.apiExpose("getDisabledDailies", getDisabledDailies);
MODULE.apiExpose("getPhysicalItemSpells", getSpells);
MODULE.apiExpose("getStaffItem", (actor: CharacterPF2e) => {
    const flag = getStaffData(actor);
    return (flag && actor.inventory.get(flag.staffId)) || null;
});
MODULE.apiExpose("isTacticAbility", isTacticAbility);
MODULE.apiExpose("openDailiesInterface", openDailiesInterface);
MODULE.apiExpose("registerCustomDailies", registerCustomDailies);
MODULE.apiExpose("retrain", retrain);
MODULE.apiExpose("retrainFromElement", async (actor: ActorPF2e, target: HTMLElement) => {
    const itemId = htmlClosest(target, "[data-item-id]")?.dataset.itemId;
    const retrainType = target.dataset.retrainType;
    return (!!itemId && !!retrainType && retrain(actor, itemId, retrainType)) || undefined;
});
MODULE.apiExpose("setStaffChargesValue", setStaffChargesValue);
MODULE.apiExpose("utils", utils);
MODULE.apiExpose("dailyHelpers", {
    createComboSkillDaily,
    createLoreSkillDaily,
    createLanguageDaily,
    createResistanceDaily,
    createScrollChainDaily,
});
