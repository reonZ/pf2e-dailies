import { registerSetting, registerSettingMenu, renderCharacterSheets } from "module-helpers";
import { CustomDailies } from "./apps/customs";
import { HomebrewDailies } from "./apps/homebrew";
import { parseDailies } from "./dailies";

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
