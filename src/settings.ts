import { CustomsMenu } from "custom";
import { parseDailies } from "dailies";
import { HomebrewsMenu } from "homebrew";
import { registerSetting, registerSettingMenu, renderCharacterSheets } from "module-helpers";

function registerSettings() {
    registerSettingMenu("customs", {
        type: CustomsMenu,
        restricted: true,
    });

    registerSettingMenu("homebrew", {
        type: HomebrewsMenu,
        restricted: true,
    });

    registerSetting("customDailies", {
        type: Array,
        default: [],
        scope: "world",
        config: false,
        onChange: () => {
            parseDailies();
        },
    });

    registerSetting("homebrewEntries", {
        type: new foundry.data.fields.TypedObjectField(
            new foundry.data.fields.ArrayField(new foundry.data.fields.StringField())
        ),
        default: {},
        scope: "world",
        config: false,
    });

    registerSetting("partyMembers", {
        type: Boolean,
        default: true,
        scope: "world",
    });

    registerSetting("addedHighlight", {
        type: Boolean,
        default: true,
        scope: "user",
        onChange: () => {
            renderCharacterSheets();
        },
    });
}

export { registerSettings };
