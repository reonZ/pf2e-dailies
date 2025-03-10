import { CharacterPF2e, ItemPF2e, R, error, getSetting, isSupressedFeat } from "module-helpers";
import { createDaily } from "./daily";
import { ancestralLongevity } from "./data/ancestral-longevity";
import { animist } from "./data/animist";
import { bladeAlly } from "./data/blade-ally";
import { ceremonialKnife } from "./data/ceremonial-knife";
import { combatFlexibility } from "./data/combat-flexibility";
import { experimentalSpellshaping } from "./data/experimental-spellshaping";
import { familiar } from "./data/familiar";
import { createLanguageDaily } from "./data/languages";
import { mindSmith } from "./data/mind-smith";
import { rations } from "./data/rations";
import { createResistanceDaily } from "./data/resistances";
import { rootMagic } from "./data/root-magic";
import { scrollAdept } from "./data/scroll-adept";
import { createScrollChainDaily } from "./data/scrolls";
import { createComboSkillDaily, createLoreSkillDaily } from "./data/skills";
import { staves } from "./data/staves";
import { thaumaturgeTome } from "./data/thaumaturge-tome";
import { tricksterAce } from "./data/trickster-ace";
import type { CustomDaily, Daily, DailyItem, PreparedDailies, PreparedDaily } from "./types";
import { utils } from "./utils";

type PreConditionDaily = {
    daily: Daily;
    condition?: DailyItem["condition"];
    index: number;
};

const DAILY_SCHEMA = "3.0.0";

const BUILTINS_DAILIES: Daily[] = [
    rations, // Rations
    familiar, // Familiar
    staves, // Staves
    experimentalSpellshaping, // Experimental Spellshaping
    ancestralLongevity, // Ancestral Longevity
    combatFlexibility, // Combat Flexibility
    scrollAdept, // Scroll Adept
    rootMagic, // Root Magic
    ceremonialKnife, // Ceremonial Knife
    tricksterAce, // Trickster Ace
    thaumaturgeTome, //Thaumaturge Tome
    bladeAlly, // Blessed Armament
    mindSmith, // Mind Smith
    animist, // Animist
    createLoreSkillDaily(
        "quick-study", // Quick Study
        "Compendium.pf2e.feats-srd.Item.aLJsBBZzlUK3G8MW"
    ),
    createComboSkillDaily(
        "ageless-spirit", // Ageless Spirit
        "Compendium.pf2e.feats-srd.Item.wylnETwIz32Au46y"
    ),
    createComboSkillDaily(
        "ancient-memories", // Ancient Memories
        "Compendium.pf2e.feats-srd.Item.ptEOt3lqjxUnAW62"
    ),
    createComboSkillDaily(
        "flexible-studies", // Flexible Studies
        "Compendium.pf2e.feats-srd.Item.9bgl6qYWKHzqWZj0"
    ),
    createLanguageDaily(
        "ancestral-linguistics", // Ancestral Linguistics
        "Compendium.pf2e.feats-srd.Item.eCWQU16hRLfN1KaX"
    ),
    createLanguageDaily(
        "borts-blesing", // Bort's Blessing
        "Compendium.pf2e.equipment-srd.Item.iS7hAQMAaThHYE8g"
    ),
    createResistanceDaily(
        "elementalist", // Elementalist Dedication
        "Compendium.pf2e.feats-srd.Item.tx9pkrpmtqe4FnvS",
        ["air", "earth", "fire", "water"],
        "half"
    ),
    createResistanceDaily(
        "ganzi", // Ganzi
        "Compendium.pf2e.heritages.Item.3reGfXH0S82hM7Gp",
        ["acid", "electricity", "sonic"],
        "half",
        true
    ),
    createResistanceDaily(
        "proteankin", // Proteankin (Nephilim feat)
        "Compendium.pf2e.feats-srd.Item.gNFPwTHDygxdf9pw",
        ["acid", "electricity", "sonic"],
        "half",
        true
    ),
    createScrollChainDaily("esoterica", [
        "Compendium.pf2e.feats-srd.Item.OqObuRB8oVSAEKFR", // Scroll Esoterica
        "Compendium.pf2e.feats-srd.Item.nWd7m0yRcIEVUy7O", // Elaborate Scroll Esoterica
        "Compendium.pf2e.feats-srd.Item.LHjPTV5vP3MOsPPJ", // Grand Scroll Esoterica
    ]),
    createScrollChainDaily("trickster", [
        "Compendium.pf2e.feats-srd.Item.ROAUR1GhC19Pjk9C", // Basic Scroll Cache
        "Compendium.pf2e.feats-srd.Item.UrOj9TROtn8nuxPf", // Expert Scroll Cache
        "Compendium.pf2e.feats-srd.Item.lIg5Gzz7W70jfbk1", // Master Scroll Cache
    ]),
];

let MODULE_DAILIES: Map<string, Daily> = new Map();

type AlwaysDaily = Omit<PreparedDaily, "condition"> & Required<Pick<PreparedDaily, "condition">>;

let BUILTINS_UUIDS: Map<string, PreConditionDaily> = new Map();
let BUILTINS_ALWAYS: AlwaysDaily[] = [];

const UUIDS: Map<string, PreConditionDaily> = new Map();
let ALWAYS: AlwaysDaily[] = [];

function prepareDailies(dailies: Daily[], prefix: DailyPrefix) {
    const uuids = new Map<string, PreConditionDaily>();
    const always: AlwaysDaily[] = [];

    for (const original of dailies) {
        const originalKey = original.key;

        try {
            const keyWithPrefix = `${prefix}.${originalKey}`;
            const daily = foundry.utils.deepClone(original) as PreparedDaily;

            daily.key = keyWithPrefix;
            daily.items ??= [];

            if (daily.condition && (!daily.items.length || !daily.items.some((x) => x.required))) {
                always.push(daily as AlwaysDaily);
            }

            for (let i = 0; i < daily.items.length; i++) {
                const { uuid, condition } = daily.items[i];
                uuids.set(uuid, { daily, index: i, condition });
            }
        } catch (err) {
            error("error.unexpected");
            console.error(err);
            console.error(`The error occured during data gathering of ${prefix}.${originalKey}`);
        }
    }

    return { uuids, always };
}

async function parseCustomDaily(custom: CustomDaily) {
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

function isValidDaily(daily: Daily) {
    return (
        typeof daily.key === "string" &&
        daily.key.trim() &&
        typeof daily.rows === "function" &&
        typeof daily.process === "function" &&
        (typeof daily.condition === "function" || Array.isArray(daily.items))
    );
}

async function parseDailies() {
    UUIDS.clear();

    const customDailies = [];
    const customs = getSetting<CustomDaily[]>("customDailies");

    for (const custom of customs) {
        if (foundry.utils.isNewerVersion(DAILY_SCHEMA, custom.schema ?? "")) {
            continue;
        }

        const daily = await parseCustomDaily(custom);

        if (daily) {
            customDailies.push(daily);
        }
    }

    for (const [uuid, daily] of BUILTINS_UUIDS) {
        UUIDS.set(uuid, daily);
    }

    const preparedCustoms = prepareDailies(customDailies, "custom");
    const preparedModules = prepareDailies(Array.from(MODULE_DAILIES.values()), "module");

    for (const [uuid, daily] of [...preparedCustoms.uuids, ...preparedModules.uuids]) {
        UUIDS.set(uuid, daily);
    }

    ALWAYS = [...BUILTINS_ALWAYS, ...preparedCustoms.always, ...preparedModules.always];
}

async function initDailies() {
    const { uuids, always } = prepareDailies(BUILTINS_DAILIES, "dailies");

    BUILTINS_UUIDS = uuids;
    BUILTINS_ALWAYS = always;

    parseDailies();
}

function getDailyFromSourceId(sourceId: string) {
    return UUIDS.get(sourceId)?.daily;
}

async function getDailies(actor: CharacterPF2e) {
    const dailies: PreparedDailies = {};

    const getDaily = async (
        daily: Daily,
        precondition?: { index: number; item: ItemPF2e; condition: DailyItem["condition"] }
    ) => {
        if (dailies[daily.key] === null) return;

        try {
            if (precondition) {
                const { condition, item } = precondition;
                if (condition && !(await condition(actor, item))) {
                    return;
                }
            }

            if (daily.condition && !(await daily.condition(actor))) {
                dailies[daily.key] = null;
                return;
            }

            if (!(daily.key in dailies)) {
                dailies[daily.key] = foundry.utils.deepClone(daily) as PreparedDaily;
            }

            const tmpDaily = dailies[daily.key]!;
            tmpDaily.prepared ??= { items: {}, custom: {}, rows: {} };

            if (precondition) {
                const { index, item } = precondition;
                const itemSlug = daily.items![index].slug;
                tmpDaily.prepared.items[itemSlug] = item;
            }
        } catch (err) {
            error("error.unexpected");
            console.error(err);
            console.error(`The error occured during data gathering of ${daily.key}`);
        }
    };

    await Promise.all(ALWAYS.map((daily) => getDaily(daily)));

    await Promise.all(
        actor.items.map((item) => {
            if (isSupressedFeat(item)) {
                return;
            }

            const sourceId = item._stats.compendiumSource ?? item.sourceId;

            if (!sourceId || (item.isOfType("physical") && item.isInvested === false)) {
                return;
            }

            const entry = UUIDS.get(sourceId);
            if (!entry) return;

            const { daily, index, condition } = entry;
            return getDaily(daily, { condition, index, item });
        })
    );

    return dailies;
}

function filterDailies(dailies: PreparedDailies) {
    return Object.values(dailies).filter(
        (daily): daily is PreparedDaily =>
            R.isNonNull(daily) &&
            Array.isArray(daily.items) &&
            !daily.items.some((item) => item.required === true && !daily.prepared.items[item.slug])
    );
}

async function getAlwaysDailies(actor: CharacterPF2e): Promise<Omit<Daily, "item">[]> {
    return Promise.all(ALWAYS.filter((daily) => daily.condition!(actor)));
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

type DailyPrefix = "custom" | "dailies" | "module";

export {
    DAILY_SCHEMA,
    filterDailies,
    getAlwaysDailies,
    getDailies,
    getDailyFromSourceId,
    initDailies,
    parseCustomDaily,
    parseDailies,
    registerCustomDailies,
};

export type { DailyPrefix };
