import { MODULE_DAILIES, parseDailies } from "dailies";
import { createDaily, Daily } from "daily";
import { error } from "module-helpers";
import { utils } from "utils";
import { isValidDaily } from ".";
import {
    createComboSkillDaily,
    createLanguageDaily,
    createLoreSkillDaily,
    createResistanceDaily,
    createScrollChainDaily,
} from "data";

async function parseCustomDaily(custom: CustomDaily): Promise<Daily | undefined> {
    try {
        const fn = new foundry.utils.AsyncFunction<Daily>(
            "utils",
            "createDaily",
            "createComboSkillDaily",
            "createLoreSkillDaily",
            "createLanguageDaily",
            "createResistanceDaily",
            "createScrollChainDaily",
            custom.code
        );
        const daily = await fn(
            utils,
            createDaily,
            createComboSkillDaily,
            createLoreSkillDaily,
            createLanguageDaily,
            createResistanceDaily,
            createScrollChainDaily
        );

        if (isValidDaily(daily)) {
            return daily;
        }
    } catch (err) {
        error("error.unexpected");
        console.error(err);
        console.error(`The error occured during creation of custom daily for ${custom.key}`);
    }
}

function registerCustomDailies(dailies: Daily[]) {
    const incompatible: Set<string> = new Set();
    const duplicates: Set<string> = new Set();

    for (const daily of dailies) {
        if (!isValidDaily(daily)) {
            incompatible.add(daily.key ?? "unknown");
            continue;
        }

        if (MODULE_DAILIES.has(daily.key)) {
            duplicates.add(daily.key);
            continue;
        }

        MODULE_DAILIES.set(daily.key, daily);
    }

    parseDailies();
}

type CustomDaily = {
    key: string;
    code: string;
    schema?: string;
};

export { parseCustomDaily, registerCustomDailies };
export type { CustomDaily };
