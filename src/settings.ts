import { registerSetting, registerSettingMenu, renderCharacterSheets } from "foundry-pf2e";
import { parseDailies } from "./dailies";
import { CustomDailies } from "./apps/customs";

function registerSettings() {
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
        onChange: renderCharacterSheets,
    });
}

export { registerSettings };
