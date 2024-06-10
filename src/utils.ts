import {
    R,
    createChatLink,
    createConsumableFromSpell,
    getActorMaxRank,
    getRankLabel,
    getSetting,
    hasFreePropertySlot,
    rollDie,
    setFlagProperty,
} from "foundry-pf2e";

type SimplifiableRuleValue = string | number | "half" | "level";

type CreateSpellConsumableSourceOptions = {
    uuid: string;
    level?: number;
    itemName?: string;
    itemImg?: ImageFilePath;
};

const utils = {
    getChoiSetRuleSelection: <T>(item: ItemPF2e, option?: string) => {
        const rules = item._source.system.rules;
        const rule = rules.find(
            (rule: ChoiceSetSource): rule is ChoiceSetSource =>
                rule.key === "ChoiceSet" && (!option || rule.rollOption === option)
        );
        return rule?.selection as T | undefined;
    },
    hasFreePropertySlot: (item: WeaponPF2e) => {
        return hasFreePropertySlot(item);
    },
    getResistanceLabel: (resistance: string, localize = true) => {
        const label = CONFIG.PF2E.resistanceTypes[resistance];
        return localize ? game.i18n.localize(label).capitalize() : label;
    },
    getResistances: () => {
        return configToOptions("resistanceTypes").map(({ label, value }) => ({
            value,
            label: label.capitalize(),
        }));
    },
    getLanguageLabel: (language: string, localize = true) => {
        const label = CONFIG.PF2E.languages[language];
        return localize ? game.i18n.localize(label) : label;
    },
    getLanguages: () => {
        return configToOptions("languages");
    },
    getSkillLabel: (skill: SkillSlug, localize = true) => {
        const label = CONFIG.PF2E.skillList[skill];
        return localize ? game.i18n.localize(label) : label;
    },
    getSkills: () => {
        return configToOptions("skillList").filter(
            (x): x is { value: SkillSlug; label: string } => x.value !== "lore"
        );
    },
    getSpellRankLabel: (rank: ZeroToTen) => {
        return getRankLabel(rank);
    },
    createExcludeFeatList: (
        actor: CharacterPF2e,
        categories: FeatOrFeatureCategory[],
        traits: string[]
    ) => {
        return R.pipe(
            actor.itemTypes.feat,
            R.filter((feat) => categories.some((category) => feat.category === category)),
            R.filter((feat) => traits.every((trait) => feat.traits.has(trait))),
            R.map((feat) => feat.sourceId)
        );
    },
    getActorMaxRank,
    getSpellcastingMaxRank: (
        actor: CharacterPF2e,
        { tradition }: { tradition?: MagicTradition } = {}
    ) => {
        const maxRank = R.pipe(
            actor.spellcasting.spellcastingFeatures,
            tradition ? R.filter((entry) => entry.tradition === tradition) : R.identity(),
            R.map((entry) => entry.highestRank),
            R.firstBy([R.identity(), "desc"])
        );
        return maxRank ?? 0;
    },
    getActors: (actor?: CharacterPF2e) => {
        const list =
            actor && getSetting("partyMembers") && actor.parties.size
                ? Array.from(actor.parties).flatMap((party) => party.members)
                : game.actors.filter((a) => a.hasPlayerOwner);
        return list.filter((a) => a !== actor);
    },
    getProficiencyLabel: (rank: OneToFour) => {
        return game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank]);
    },
    getWeaponPropertyRuneLabel: (rune: WeaponPropertyRuneType) => {
        return game.i18n.localize(`PF2E.WeaponPropertyRune.${rune}.Name`);
    },
    getWeaponPotencyRuneLabel: (potency: ZeroToFour) => {
        return game.i18n.localize(`PF2E.WeaponPotencyRune${potency}`);
    },
    getWeaponTraitLabel: (trait: string) => {
        return game.i18n.localize(CONFIG.PF2E.weaponTraits[trait]);
    },
    getWeaponDamageLabel: (damage: DamageType) => {
        return game.i18n.localize(CONFIG.PF2E.damageTypes[damage]);
    },
    getWeaponGroupLabel: (group: WeaponGroup) => {
        return game.i18n.localize(CONFIG.PF2E.weaponGroups[group]);
    },
    getPreciousMaterialLabel(material: PreciousMaterialType) {
        return game.i18n.localize(CONFIG.PF2E.preciousMaterials[material]);
    },
    createFeatSource: async (uuid: string) => {
        const source = (await fromUuid<FeatPF2e>(uuid))?.toObject();

        if (source?.type !== "feat") {
            throw new Error(
                `An error occured while trying to create a feat source with uuid: ${uuid}`
            );
        }

        return source;
    },
    createSpellScrollSource: (options: CreateSpellConsumableSourceOptions) => {
        return createSpellConsumableSource("scroll", options);
    },
    createWandSource: (options: CreateSpellConsumableSourceOptions) => {
        return createSpellConsumableSource("wand", options);
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
    }) => {
        const rule = {
            key: "ActiveEffectLike",
            mode,
            path: `system.skills.${skill}.rank`,
            value,
            predicate,
        };

        return rule;
    },
    createLoreSource: ({ name, rank }: { name: string; rank: ZeroToFour }) => {
        const data: PreCreate<LoreSource> = {
            type: "lore",
            img: "systems/pf2e/icons/default-icons/lore.svg",
            name,
            system: { proficient: { value: rank } },
        } as const;

        return data;
    },
    createResistanceRuleElement: ({
        type,
        value,
        predicate,
    }: {
        type: string;
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
    createChatLink: (itemOrUuid: ItemPF2e | string, label?: string) => {
        const uuid =
            itemOrUuid instanceof Item ? itemOrUuid.sourceId ?? itemOrUuid.uuid : itemOrUuid;
        return createChatLink(uuid, { label });
    },
    selectRandomOption: (
        options: (string | { value: string })[] | HTMLSelectElement | HTMLOptionsCollection
    ) => {
        options = options instanceof HTMLSelectElement ? options.options : options;
        options =
            options instanceof HTMLOptionsCollection
                ? Array.from(options).map((option) => option.value)
                : options;

        if (options.length === 0) return "";

        const roll = rollDie(options.length);
        const result = options[roll - 1];

        return typeof result === "object" ? result.value : result;
    },
    createSpellcastingEntrySource: ({
        category,
        identifier,
        name,
        sort,
        attribute,
        proficiencySlug,
        showSlotlessRanks,
        proficiencyRank,
        tradition,
        flags,
    }: {
        category: SpellcastingCategory;
        identifier: string;
        name: string;
        sort?: number;
        attribute?: AttributeString | null;
        proficiencySlug?: string;
        showSlotlessRanks?: boolean;
        proficiencyRank?: ZeroToFour | null;
        tradition?: MagicTradition;
        flags?: Record<string, JSONValue>;
    }) => {
        const source: PreCreate<SpellcastingEntrySource> = {
            type: "spellcastingEntry",
            name,
            sort: sort ?? 0,
            system: {
                ability: {
                    value: (!proficiencySlug && attribute) || "",
                },
                prepared: {
                    value: category,
                },
                showSlotlessLevels: {
                    value: showSlotlessRanks ?? false,
                },
                proficiency: {
                    value: proficiencyRank ?? 1,
                    slug: proficiencySlug ?? "",
                },
                tradition: {
                    value: tradition ?? "arcane",
                },
            },
        };

        setFlagProperty(source, "identifier", identifier);

        if (R.isPlainObject(flags)) {
            setFlagProperty(source, "extra", flags);
        }

        return source;
    },
    createSpellSource: async (
        uuid: string,
        { identifier, rank }: { identifier?: string; rank?: ZeroToTen } = {}
    ) => {
        const source = (await fromUuid<SpellPF2e>(uuid))?.toObject();

        if (source?.type !== "spell") {
            throw new Error(
                `An error occured while trying to create a spell source with uuid: ${uuid}`
            );
        }

        if (identifier) {
            setFlagProperty(source, "identifier", identifier);
        }

        if (R.isNumber(rank)) {
            setFlagProperty(source, "rank", rank);
        }

        return source;
    },
    getSpellWithRankLabel: (uuid: string, rank: OneToTen) => {
        const name = fromUuidSync(uuid)?.name ?? "";
        return `${name} (${getRankLabel(rank)})`;
    },
};

function configToOptions<T extends keyof typeof CONFIG.PF2E>(type: T, capitalize = false) {
    return R.pipe(
        CONFIG.PF2E[type],
        R.entries(),
        R.map(([value, label]) => ({ value, label }))
    );
}

async function createSpellConsumableSource(
    type: SpellConsumableItemType,
    { uuid, level, itemName, itemImg }: CreateSpellConsumableSourceOptions
) {
    const spell = await fromUuid<SpellPF2e>(uuid);

    if (!spell?.isOfType("spell")) {
        throw new Error(
            `An error occured while trying to create a spell scroll source with uuid: ${uuid}`
        );
    }

    return createConsumableFromSpell(spell, {
        type,
        heightenedLevel: level,
        temp: true,
        itemName,
        itemImg,
    });
}

function simplifyRuleValue(value: SimplifiableRuleValue) {
    return value === "half"
        ? "max(1,floor(@actor.level/2))"
        : value === "level"
        ? "max(1,@actor.level)"
        : value;
}

export { utils };
export type { SimplifiableRuleValue };
