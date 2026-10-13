import { DailyRuleElement } from "daily";
import {
    ActorPF2e,
    ArmorPF2e,
    AttributeString,
    CharacterPF2e,
    ConsumableSource,
    createChatLink,
    CreatedSpellcastingEntrySource,
    createHTMLElement,
    createSpellcastingSource,
    CreateSpellcastingSource,
    CreaturePF2e,
    DamageType,
    FeatOrFeatureCategory,
    FeatSource,
    FeatTrait,
    findItemWithSourceId,
    getActorWeapons,
    getChoiceSetSelection,
    getItemSourceFromUuid,
    getItemSourceId,
    getSetting,
    getSkillLabel,
    getSpellRankLabel,
    htmlQueryAll,
    ImageFilePath,
    ItemInstances,
    ItemPF2e,
    ItemSourcePF2e,
    ItemType,
    ItemUUID,
    Language,
    LoreSource,
    MagicTradition,
    OneToFour,
    OneToTen,
    PhysicalItemPF2e,
    PreciousMaterialType,
    R,
    ResistanceType,
    setFlagProperty,
    ShieldPF2e,
    SkillSlug,
    SpellConsumableItemType,
    SpellPF2e,
    SpellSource,
    SYSTEM,
    WeaponGroup,
    WeaponPF2e,
    WeaponPropertyRuneType,
    WeaponTrait,
    ZeroToFour,
    ZeroToTen,
} from "foundry-helpers";
import { createConsumableFromSpell } from "foundry-helpers/dist";
import { getSpellcastingMaxRank } from "spellcasting";

const utils = {
    createChatLink: (itemOrUuid: ItemPF2e | string, label?: string): string => {
        const uuid = itemOrUuid instanceof Item ? (itemOrUuid.sourceId ?? itemOrUuid.uuid) : itemOrUuid;
        return createChatLink(uuid, { label });
    },
    createExcludeFeatList: (
        actor: CharacterPF2e,
        categories: FeatOrFeatureCategory[],
        traits: FeatTrait[],
    ): ItemUUID[] => {
        return R.pipe(
            actor.itemTypes.feat,
            R.filter((feat) => categories.some((category) => feat.category === category)),
            R.filter((feat) => traits.every((trait) => feat.traits.has(trait))),
            R.map((feat) => feat.sourceId),
            R.filter(R.isTruthy),
        );
    },
    createFeatSource: async (uuid: string): Promise<FeatSource> => {
        const source = await getItemSourceFromUuid(uuid, "feat");

        if (!source) {
            throw new Error(`An error occured while trying to create a feat source with uuid: ${uuid}`);
        }

        return source;
    },
    createLanguageRuleElement: ({
        language,
        mode = "add",
        predicate,
    }: {
        language: string;
        mode?: "add";
        predicate?: any[];
    }) => {
        const rule = {
            key: "ActiveEffectLike",
            mode,
            path: "system.build.languages.granted",
            value: {
                slug: language,
                source: "{item|name}",
            },
            predicate,
        };

        return rule;
    },
    createLoreRuleElement: ({
        attribute = "int",
        label = "{item|name}",
        rank = 1,
        slug,
    }: {
        slug: string;
        attribute?: AttributeString;
        label?: string;
        rank?: ZeroToFour | string;
    }): DailyRuleElement => {
        slug = SYSTEM.sluggify(slug);
        const pathSlug = slug.endsWith("-lore") ? slug : `${slug}-lore`;

        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: `system.skills.${pathSlug}`,
            value: { attribute, label, rank },
        };
    },
    createLoreSource: ({ name, rank }: { name: string; rank: ZeroToFour }): PreCreate<LoreSource> => {
        return {
            type: "lore",
            img: SYSTEM.relativePath("icons/default-icons/lore.svg"),
            name,
            system: { proficient: { value: rank } },
        };
    },
    createResistanceRuleElement: ({
        type,
        value,
        predicate,
    }: {
        type: ResistanceType;
        value: SimplifiableRuleValue;
        predicate?: any[];
    }) => {
        const rule = {
            key: "Resistance",
            type,
            value: simplifyRuleValue(value),
            predicate,
        };

        return rule;
    },
    createSkillRuleElement: ({
        skill,
        mode = "upgrade",
        value,
        predicate,
    }: {
        skill: SkillSlug;
        mode?: "upgrade";
        value: number;
        predicate?: any[];
    }): DailyRuleElement => {
        const rule = {
            key: "ActiveEffectLike",
            mode,
            path: `system.skills.${skill}.rank`,
            value,
            predicate,
        };

        return rule;
    },
    createSpellcastingEntrySource: (
        options: CreateSpellcastingSource & { identifier?: string },
    ): CreatedSpellcastingEntrySource => {
        const source = createSpellcastingSource(options);

        if (options.identifier) {
            setFlagProperty(source, "identifier", options.identifier);
        }

        return source;
    },
    createSpellScrollSource: (options: CreateSpellConsumableSourceOptions): Promise<ConsumableSource> => {
        return createSpellConsumableSource("scroll", options);
    },
    createSpellSource: async (
        uuid: string,
        { identifier, signature, rank }: { identifier?: string; signature?: boolean; rank?: ZeroToTen } = {},
    ): Promise<SpellSource> => {
        const source = await getItemSourceFromUuid(uuid, "spell");

        if (!source) {
            throw new Error(`An error occured while trying to create a spell source with uuid: ${uuid}`);
        }

        if (identifier) {
            setFlagProperty(source, "identifier", identifier);
        }

        if (signature && !source.system.traits.value.includes("cantrip")) {
            setFlagProperty(source, "signature", true);
        }

        if (R.isNumber(rank)) {
            setFlagProperty(source, "rank", rank);
        }

        return source;
    },
    createWandSource: (options: CreateSpellConsumableSourceOptions): Promise<ConsumableSource> => {
        return createSpellConsumableSource("wand", options);
    },
    getActorMaxRank: (actor: CreaturePF2e): OneToTen => {
        return Math.max(1, Math.ceil(actor.level / 2)) as OneToTen;
    },
    getActors: (actor?: CharacterPF2e): ActorPF2e[] => {
        const list =
            actor && getSetting("partyMembers") && actor.parties.size
                ? Array.from(actor.parties).flatMap((party) => party.members)
                : game.actors.filter((a) => a.hasPlayerOwner);
        return actor ? list.filter((a) => a !== actor) : list;
    },
    getActorWeapons: <TActor extends ActorPF2e>(actor: TActor): WeaponPF2e<TActor>[] => {
        return getActorWeapons(actor);
    },
    getChoiSetRuleSelection: (
        item: ItemPF2e,
        option?: string | { option?: string; flag?: string },
    ): string | undefined => {
        const options = typeof option === "string" ? { option } : option;
        return getChoiceSetSelection(item, options);
    },
    getItemSource: <T extends ItemType | "physical" | never>(
        uuid: string,
        type?: T,
    ): T extends ItemType
        ? Promise<ItemInstances<ActorPF2e>[T]["_source"] | null>
        : T extends "physical"
          ? Promise<PhysicalItemPF2e["_source"] | null>
          : Promise<ItemSourcePF2e | null> => {
        return getItemSourceFromUuid(uuid, type) as any;
    },
    getItemTypeLabel: (type: ItemType): string => {
        return game.i18n.localize(`TYPES.Item.${type}`);
    },
    getLanguageLabel: (language: Language, localize = true): string => {
        const label = CONFIG.PF2E.languages[language];
        return localize ? game.i18n.localize(label) : label;
    },
    getLanguages: (): { value: Language; label: string }[] => {
        return R.pipe(
            CONFIG.PF2E.languages,
            R.entries(),
            R.map(([value, label]) => ({ value, label })),
        );
    },
    getPhysicalItemSpells,
    getPreciousMaterialLabel(material: PreciousMaterialType): string {
        return game.i18n.localize(CONFIG.PF2E.preciousMaterials[material]);
    },
    getProficiencyLabel: (rank: OneToFour): string => {
        return game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank]);
    },
    getResistanceLabel: (resistance: ResistanceType, localize = true): string => {
        const label = CONFIG.PF2E.resistanceTypes[resistance];
        return localize ? game.i18n.localize(label).capitalize() : label;
    },
    getResistances: (): { value: ResistanceType; label: string }[] => {
        return R.pipe(
            CONFIG.PF2E.resistanceTypes,
            R.entries(),
            R.map(([value, label]) => ({ value, label: label.capitalize() })),
        );
    },
    getRunedItemName: (item: WeaponPF2e | ArmorPF2e | ShieldPF2e): string => {
        return item.name !== item._source.name ? `... ${item._source.name}` : item.name;
    },
    getSkillLabel: (skill: SkillSlug, localize?: boolean): string => {
        return getSkillLabel(skill, localize);
    },
    getSourceId: (item: ItemPF2e): ItemUUID => {
        return getItemSourceId(item);
    },
    getSkills: (): { value: SkillSlug; label: string }[] => {
        return R.pipe(
            CONFIG.PF2E.skills,
            R.entries(),
            R.map(([value, { label }]) => ({ value, label })),
        );
    },
    getSpellcastingMaxRank: (
        actor: CharacterPF2e,
        { tradition, rankLimit }: { tradition?: MagicTradition; rankLimit?: OneToTen } = {},
    ): ZeroToTen => {
        const maxRank = R.pipe(
            actor.spellcasting.spellcastingFeatures,
            tradition ? R.filter((entry) => entry.tradition === tradition) : R.identity(),
            R.map((entry) => getSpellcastingMaxRank(entry, rankLimit)),
            R.firstBy([R.identity(), "desc"]),
        );
        return maxRank ?? 0;
    },
    getSpellRankLabel: (rank: ZeroToTen): string => {
        return getSpellRankLabel(rank);
    },
    getSpellWithRankLabel: (uuid: string, rank: OneToTen): string => {
        const name = fromUuidSync(uuid, { strict: false })?.name ?? "";
        return `${name} (${getSpellRankLabel(rank)})`;
    },
    getWeaponDamageLabel: (damage: DamageType): string => {
        return game.i18n.localize(CONFIG.PF2E.damageTypes[damage]);
    },
    getWeaponPotencyRuneLabel: (potency: ZeroToFour): string => {
        return game.i18n.localize(`PF2E.WeaponPotencyRune${potency}`);
    },
    getWeaponPropertyRuneLabel: (rune: WeaponPropertyRuneType): string => {
        return game.i18n.localize(`PF2E.WeaponPropertyRune.${rune}.Name`);
    },
    getWeaponTraitLabel: (trait: WeaponTrait): string => {
        return game.i18n.localize(CONFIG.PF2E.weaponTraits[trait]);
    },
    getWeaponGroupLabel: (group: WeaponGroup): string => {
        return game.i18n.localize(CONFIG.PF2E.weaponGroups[group]);
    },
    hasFreePropertySlot: (item: WeaponPF2e): boolean => {
        const potency = item.system.runes.potency;
        return potency > 0 && item.system.runes.property.length < potency;
    },
    hasItemWithSourceId: (actor: ActorPF2e, uuid: string, type?: ItemType) => {
        return !!findItemWithSourceId(actor, uuid, type);
    },
    selectRandomOption: (
        options: (string | { value: string })[] | HTMLSelectElement | HTMLOptionsCollection,
    ): string => {
        options = options instanceof HTMLSelectElement ? options.options : options;
        options =
            options instanceof HTMLOptionsCollection ? Array.from(options).map((option) => option.value) : options;

        if (options.length === 0) return "";

        const roll = rollDie(options.length);
        const result = options[roll - 1];

        return typeof result === "object" ? result.value : result;
    },
};

async function createSpellConsumableSource(
    type: SpellConsumableItemType,
    { uuid, level, itemName, itemImg }: CreateSpellConsumableSourceOptions,
): Promise<ConsumableSource> {
    const spell = await fromUuid<SpellPF2e>(uuid);

    if (!spell?.isOfType("spell")) {
        throw new Error(`An error occured while trying to create a spell scroll source with uuid: ${uuid}`);
    }

    return createConsumableFromSpell(spell, {
        type,
        heightenedLevel: level,
        temp: true,
        itemName,
        itemImg,
    });
}

function simplifyRuleValue(value: SimplifiableRuleValue): string | number {
    return value === "half" ? "max(1,floor(@actor.level/2))" : value === "level" ? "max(1,@actor.level)" : value;
}

function rollDie(faces: number, nb = 1) {
    let total = 0;
    for (let i = 0; i < nb; i++) {
        total += Math.floor(Math.random() * faces) + 1;
    }
    return total;
}

function createUpdateCollection<T extends EmbeddedDocumentUpdateData>(): [Collection<string, T>, (data: T) => void] {
    const collection = new Collection<string, T>();

    return [
        collection,
        (data: T) => {
            if (data._id) {
                const update = collection.get(data._id) ?? {};
                collection.set(data._id, foundry.utils.mergeObject(update, data));
            }
        },
    ];
}

const LABEL_REGEX = /\d+/;
const UUID_REGEX = /@(uuid|compendium)\[([a-z0-9\._-]+)\]/gi;
async function getPhysicalItemSpells(
    item: Maybe<ItemPF2e>,
    maxRank: number,
    entryId: string | null = null,
): Promise<SpellSource[]> {
    if (!item) return [];

    const descriptionEl = createHTMLElement("div", { content: item.description });
    const spellLists = descriptionEl.querySelectorAll("ul");
    const spellList = spellLists[spellLists.length - 1];
    if (!spellList) return [];

    const spellsData = R.pipe(
        htmlQueryAll(spellList, "li"),
        R.flatMap((SpellRankEL) => {
            const label = (SpellRankEL.firstChild as HTMLElement).textContent.split("@")[0];
            const rank = Number(label.match(LABEL_REGEX)?.[0] || "0") as ZeroToTen;
            const text = SpellRankEL.textContent ?? "";
            const uuids = Array.from(text.matchAll(UUID_REGEX)).map(getUuidFromInlineMatch);

            return uuids.map((uuid) => ({ rank, uuid }));
        }),
        R.filter(({ rank }) => rank <= maxRank),
    );

    const spells = await Promise.all(
        spellsData.map(async ({ rank, uuid }) => {
            const spell = await fromUuid<ItemPF2e>(uuid);
            if (!(spell instanceof Item) || !spell.isOfType("spell")) return;

            const source = spell.toObject();

            source._id = foundry.utils.randomID();
            source.system.location.value = entryId;

            if (!spell.isCantrip && rank !== spell.baseRank) {
                source.system.location.heightenedLevel = rank;
            }

            return source;
        }),
    );

    return R.filter(spells, R.isTruthy);
}

function getUuidFromInlineMatch(match: RegExpExecArray | RegExpMatchArray) {
    return match[1] === "Compendium" ? `Compendium.${match[2]}` : match[2];
}

type CreateSpellConsumableSourceOptions = {
    uuid: string;
    level?: number;
    itemName?: string;
    itemImg?: ImageFilePath;
};

type SimplifiableRuleValue = "half" | "level" | (string & {}) | (number & {});

export { createUpdateCollection, getPhysicalItemSpells, getUuidFromInlineMatch, utils };
export type { SimplifiableRuleValue };
