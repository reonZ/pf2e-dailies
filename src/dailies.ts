import { CustomDaily, parseCustomDaily } from "custom/custom";
import { Daily, DailyCustom, DailyItem, DailyRow } from "daily";
import {
    ancestralLongevity,
    animist,
    bladeAlly,
    ceremonialKnife,
    combatFlexibility,
    commanderTactics,
    coreMemories,
    createComboSkillDaily,
    createLanguageDaily,
    createLoreSkillDaily,
    createResistanceDaily,
    createScrollChainDaily,
    experimentalSpellshaping,
    familiar,
    mindSmith,
    rations,
    rootMagic,
    scrollAdept,
    staves,
    thaumaturgeTome,
    tricksterAce,
    wandering,
    warshard,
} from "data";
import {
    CharacterPF2e,
    error,
    getItemSourceId,
    getSetting,
    isSupressedFeat,
    ItemPF2e,
    MapOfArrays,
    MODULE,
    R,
} from "module-helpers";

const DAILY_SCHEMA = "3.0.0";
const MODULE_DAILIES: Map<string, Daily> = new Map();

const PREFIXES = {
    dailies: "dailies",
    custom: "custom",
    module: "module",
} as const;

const BUILTINS_DAILIES: Daily[] = [
    ancestralLongevity, // Ancestral Longevity
    animist, // Animist
    bladeAlly, // Blessed Armament
    ceremonialKnife, // Ceremonial Knife
    combatFlexibility, // Combat Flexibility
    commanderTactics, // Commander Tactics
    coreMemories, // Core Memories
    experimentalSpellshaping, // Experimental Spellshaping
    familiar, // Familiar
    mindSmith, // Mind Smith
    rations, // Rations
    rootMagic, // Root Magic
    scrollAdept, // Scroll Adept
    staves, // Staves
    thaumaturgeTome, //Thaumaturge Tome
    tricksterAce, // Trickster Ace
    wandering, // Animist Wandering Feats
    warshard, // Warshard Warrior Dedication
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
        ["air", "earth", "fire", "water", "metal", "wood"],
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

const ALL_DAILIES: Map<string, Daily> = new Map();

const BUILTINS_UUIDS = new MapOfArrays<PreConditionDaily, ItemUUID>();
const BUILTINS_ALWAYS: AlwaysDaily[] = [];

const UUIDS = new MapOfArrays<PreConditionDaily, ItemUUID>();
const ALWAYS: AlwaysDaily[] = [];

function prepareDailies(
    dailies: Daily[],
    prefix: DailyPrefix
): {
    uuids: Map<ItemUUID, PreConditionDaily>;
    always: AlwaysDaily[];
} {
    const uuids = new Map<ItemUUID, PreConditionDaily>();
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

async function initializeDailies() {
    BUILTINS_UUIDS.clear();
    BUILTINS_ALWAYS.length = 0;

    const { uuids, always } = prepareDailies(BUILTINS_DAILIES, PREFIXES.dailies);

    for (const [uuid, daily] of uuids) {
        BUILTINS_UUIDS.add(uuid, daily);
    }

    BUILTINS_ALWAYS.push(...always);

    parseDailies();
}

async function parseDailies() {
    ALL_DAILIES.clear();
    UUIDS.clear();
    ALWAYS.length = 0;

    const customDailies: Daily[] = [];
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

    for (const [uuid, dailies] of BUILTINS_UUIDS) {
        UUIDS.add(uuid, dailies);
    }

    const modulesDailies = Array.from(MODULE_DAILIES.values());
    const preparedCustoms = prepareDailies(customDailies, PREFIXES.custom);
    const preparedModules = prepareDailies(modulesDailies, PREFIXES.module);

    for (const [uuid, daily] of [...preparedCustoms.uuids, ...preparedModules.uuids]) {
        UUIDS.add(uuid, daily);
    }

    ALWAYS.push(...BUILTINS_ALWAYS, ...preparedCustoms.always, ...preparedModules.always);

    for (const [dailies, prefix] of [
        [BUILTINS_DAILIES, PREFIXES.dailies],
        [customDailies, PREFIXES.custom],
        [modulesDailies, PREFIXES.module],
    ] as const) {
        for (const daily of dailies) {
            const key = `${prefix}.${daily.key}`;
            ALL_DAILIES.set(key, daily);
        }
    }

    MODULE.debug("Dailies", ALL_DAILIES);
    MODULE.debug("Dailies UUIDS", UUIDS);
    MODULE.debug("Dailies ALWAYS", ALWAYS);
}

async function getDailies(actor: CharacterPF2e): Promise<PreparedDailies> {
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
        actor.items.map(async (item) => {
            if (isSupressedFeat(item)) {
                return;
            }

            const sourceId = getItemSourceId(item);
            if (!sourceId || (item.isOfType("physical") && item.isInvested === false)) {
                return;
            }

            const dailies = UUIDS.get(sourceId);
            if (!dailies?.length) return;

            return dailies.map(({ daily, index, condition }) => {
                return getDaily(daily, { condition, index, item });
            });
        })
    );

    return dailies;
}

function filterDailies(dailies: PreparedDailies): PreparedDaily[] {
    return Object.values(dailies).filter((daily): daily is PreparedDaily => {
        return (
            R.isNonNull(daily) &&
            Array.isArray(daily.items) &&
            !daily.items.some((item) => item.required === true && !daily.prepared.items[item.slug])
        );
    });
}

function getRawDaily(key: string): Daily | undefined {
    return ALL_DAILIES.get(key) ?? ALL_DAILIES.get(`${PREFIXES.dailies}.${key}`);
}

type DailyPrefix = keyof typeof PREFIXES;

type PreparedDaily = Daily & {
    prepared: PreparedDailyData;
};

type PreparedDailyData = {
    items: DailyOptionsItems<string>;
    custom: DailyCustom;
    rows: Record<string, DailyRow>;
};

type DailyOptionsItems<TItemSlug extends string = string> = Record<TItemSlug, ItemPF2e | undefined>;

type AlwaysDaily = Omit<PreparedDaily, "condition"> & Required<Pick<PreparedDaily, "condition">>;

type PreConditionDaily = {
    daily: Daily;
    condition?: DailyItem["condition"];
    index: number;
};

type PreparedDailies = Record<string, PreparedDaily | null>;

export {
    DAILY_SCHEMA,
    filterDailies,
    getDailies,
    getRawDaily,
    initializeDailies,
    MODULE_DAILIES,
    parseDailies,
};
export type { PreparedDailies, PreparedDaily };
