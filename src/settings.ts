import { registerSetting, registerSettingMenu, renderCharacterSheets } from "foundry-pf2e";
import { parseDailies } from "./dailies";
import { CustomDailies } from "./apps/customs";
import { HomebrewDailies } from "./apps/homebrew";

function registerSettings() {
    registerSetting({
        key: "customDailies",
        type: Array,
        default: [],
        config: false,
        onChange: parseDailies,
    });

    registerSetting({
        key: "homebrewEntries",
        type: Object,
        default: {},
        config: false,
    });

    registerSettingMenu({
        key: "customs",
        type: CustomDailies,
    });

    registerSettingMenu({
        key: "homebrew",
        type: HomebrewDailies,
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
