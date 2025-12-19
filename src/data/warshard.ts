import { createDaily } from "daily";
import {
    CharacterPF2e,
    getFlag,
    hasItemWithSourceId,
    localize,
    MartialProficiency,
    R,
    setFlagProperty,
    unsetFlagProperty,
    WeaponMaterialSource,
    WeaponMaterialType,
    WeaponPF2e,
    WeaponPropertyRuneType,
    ZeroToFour,
} from "module-helpers";
import { utils } from "utils";

/**
 * generated from
 * https://github.com/foundryvtt/pf2e/blob/5d94764870656060475c57ad9ccb3803d3b528f1/src/module/item/physical/runes.ts#L912
 */
const COMMON_WEAPON_RUNES = [
    {
        name: "PF2E.WeaponPropertyRune.ashen.Name",
        level: 9,
        slug: "ashen",
    },
    {
        name: "PF2E.WeaponPropertyRune.astral.Name",
        level: 8,
        slug: "astral",
    },
    {
        name: "PF2E.WeaponPropertyRune.authorized.Name",
        level: 3,
        slug: "authorized",
    },
    {
        name: "PF2E.WeaponPropertyRune.brilliant.Name",
        level: 12,
        slug: "brilliant",
    },
    {
        name: "PF2E.WeaponPropertyRune.called.Name",
        level: 7,
        slug: "called",
    },
    {
        name: "PF2E.WeaponPropertyRune.coating.Name",
        level: 9,
        slug: "coating",
    },
    {
        name: "PF2E.WeaponPropertyRune.conducting.Name",
        level: 7,
        slug: "conducting",
    },
    {
        name: "PF2E.WeaponPropertyRune.corrosive.Name",
        level: 8,
        slug: "corrosive",
    },
    {
        name: "PF2E.WeaponPropertyRune.cunning.Name",
        level: 5,
        slug: "cunning",
    },
    {
        name: "PF2E.WeaponPropertyRune.decaying.Name",
        level: 8,
        slug: "decaying",
    },
    {
        name: "PF2E.WeaponPropertyRune.disrupting.Name",
        level: 5,
        slug: "disrupting",
    },
    {
        name: "PF2E.WeaponPropertyRune.earthbinding.Name",
        level: 5,
        slug: "earthbinding",
    },
    {
        name: "PF2E.WeaponPropertyRune.extending.Name",
        level: 7,
        slug: "extending",
    },
    {
        name: "PF2E.WeaponPropertyRune.fearsome.Name",
        level: 5,
        slug: "fearsome",
    },
    {
        name: "PF2E.WeaponPropertyRune.flaming.Name",
        level: 8,
        slug: "flaming",
    },
    {
        name: "PF2E.WeaponPropertyRune.flurrying.Name",
        level: 7,
        slug: "flurrying",
    },
    {
        name: "PF2E.WeaponPropertyRune.frost.Name",
        level: 8,
        slug: "frost",
    },
    {
        name: "PF2E.WeaponPropertyRune.ghostTouch.Name",
        level: 4,
        slug: "ghostTouch",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterAshen.Name",
        level: 16,
        slug: "greaterAshen",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterAstral.Name",
        level: 15,
        slug: "greaterAstral",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterBrilliant.Name",
        level: 18,
        slug: "greaterBrilliant",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterCorrosive.Name",
        level: 15,
        slug: "greaterCorrosive",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterDecaying.Name",
        level: 15,
        slug: "greaterDecaying",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterExtending.Name",
        level: 13,
        slug: "greaterExtending",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterFearsome.Name",
        level: 12,
        slug: "greaterFearsome",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterFlaming.Name",
        level: 15,
        slug: "greaterFlaming",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterFrost.Name",
        level: 15,
        slug: "greaterFrost",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterImpactful.Name",
        level: 17,
        slug: "greaterImpactful",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterRooting.Name",
        level: 11,
        slug: "greaterRooting",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterShock.Name",
        level: 15,
        slug: "greaterShock",
    },
    {
        name: "PF2E.WeaponPropertyRune.greaterThundering.Name",
        level: 15,
        slug: "greaterThundering",
    },
    {
        name: "PF2E.WeaponPropertyRune.grievous.Name",
        level: 9,
        slug: "grievous",
    },
    {
        name: "PF2E.WeaponPropertyRune.holy.Name",
        level: 11,
        slug: "holy",
    },
    {
        name: "PF2E.WeaponPropertyRune.impactful.Name",
        level: 10,
        slug: "impactful",
    },
    {
        name: "PF2E.WeaponPropertyRune.impossible.Name",
        level: 20,
        slug: "impossible",
    },
    {
        name: "PF2E.WeaponPropertyRune.majorRooting.Name",
        level: 15,
        slug: "majorRooting",
    },
    {
        name: "PF2E.WeaponPropertyRune.merciful.Name",
        level: 4,
        slug: "merciful",
    },
    {
        name: "PF2E.WeaponPropertyRune.returning.Name",
        level: 3,
        slug: "returning",
    },
    {
        name: "PF2E.WeaponPropertyRune.rooting.Name",
        level: 7,
        slug: "rooting",
    },
    {
        name: "PF2E.WeaponPropertyRune.shifting.Name",
        level: 6,
        slug: "shifting",
    },
    {
        name: "PF2E.WeaponPropertyRune.shock.Name",
        level: 8,
        slug: "shock",
    },
    {
        name: "PF2E.WeaponPropertyRune.shockwave.Name",
        level: 13,
        slug: "shockwave",
    },
    {
        name: "PF2E.WeaponPropertyRune.swarming.Name",
        level: 9,
        slug: "swarming",
    },
    {
        name: "PF2E.WeaponPropertyRune.thundering.Name",
        level: 8,
        slug: "thundering",
    },
    {
        name: "PF2E.WeaponPropertyRune.trueRooting.Name",
        level: 19,
        slug: "trueRooting",
    },
    {
        name: "PF2E.WeaponPropertyRune.underwater.Name",
        level: 3,
        slug: "underwater",
    },
    {
        name: "PF2E.WeaponPropertyRune.unholy.Name",
        level: 11,
        slug: "unholy",
    },
    {
        name: "PF2E.WeaponPropertyRune.wounding.Name",
        level: 7,
        slug: "wounding",
    },
];

/**
 * generated from
 * https://github.com/foundryvtt/pf2e/blob/1465f7190b2b8454094c50fa6d06e9902e0a3c41/src/module/item/physical/materials.ts#L39
 */
const WEAPON_MATERIALS: PartialRecord<
    WeaponMaterialType,
    { low?: number; standard?: number; high?: number }
> = {
    abysium: {
        standard: 12,
        high: 18,
    },
    adamantine: {
        standard: 11,
        high: 17,
    },
    "cold-iron": {
        low: 2,
        standard: 10,
        high: 16,
    },
    dawnsilver: {
        standard: 11,
        high: 17,
    },
    djezet: {
        standard: 12,
        high: 18,
    },
    duskwood: {
        standard: 11,
        high: 17,
    },
    inubrix: {
        standard: 11,
        high: 17,
    },
    "keep-stone": {
        high: 18,
    },
    noqual: {
        standard: 12,
        high: 18,
    },
    peachwood: {
        standard: 12,
        high: 18,
    },
    orichalcum: {
        high: 18,
    },
    siccatite: {
        standard: 11,
        high: 17,
    },
    silver: {
        low: 2,
        standard: 10,
        high: 16,
    },
    "sisterstone-dusk": {
        low: 3,
        standard: 11,
        high: 19,
    },
    "sisterstone-scarlet": {
        low: 3,
        standard: 11,
        high: 19,
    },
    sloughstone: {
        standard: 8,
        high: 16,
    },
    "sovereign-steel": {
        standard: 12,
        high: 19,
    },
    warpglass: {
        high: 17,
    },
};

const TRANSMUTE_WEAPON_UUID = "Compendium.pf2e.feats-srd.Item.n7a7ltuY9C4qcAiT";

const warshard = createDaily({
    key: "warshard",
    items: [
        {
            slug: "dedication", // Warshard Warrior Dedication
            uuid: "Compendium.pf2e.feats-srd.Item.GtohZQvFVZaIQD0S",
            required: true,
        },
        {
            slug: "rune", // Warshard Rune
            uuid: "Compendium.pf2e.feats-srd.Item.MsNPLqPsWgOO0dqh",
        },
        {
            slug: "transmute", // Transmute Weapon
            uuid: TRANSMUTE_WEAPON_UUID,
        },
    ],
    rows: (actor, items) => {
        const weapons = actor.itemTypes.weapon.filter((weapon) => {
            const options = new Set(weapon.getRollOptions("item"));
            const rank = getWeaponProficiencyRank(actor, weapon, options);

            return rank >= 2;
        });

        if (!weapons.length) return [];

        const actorLevel = actor.level;

        const weaponOptions = weapons.map(({ id, name }) => ({ value: id, label: name }));

        const runeOptions = R.pipe(
            COMMON_WEAPON_RUNES,
            R.filter(({ level }) => level <= actorLevel),
            R.map(({ name, slug }) => ({ value: slug, label: name })),
            R.sortBy(R.prop("label"))
        );

        const materialOptions = R.pipe(
            WEAPON_MATERIALS,
            R.entries(),
            R.filter(([_, { low = Infinity, standard = Infinity, high = Infinity }]) => {
                const lowest = Math.min(low, standard, high);
                return lowest <= actorLevel;
            }),
            R.map(([slug]) => ({
                value: slug,
                label: CONFIG.PF2E.preciousMaterials[slug],
            }))
        );

        return [
            {
                type: "select",
                slug: "weapon",
                label: "TYPES.Item.weapon",
                options: weaponOptions,
            },
            {
                type: "select",
                slug: "rune",
                label: items.rune?.name,
                options: runeOptions,
                condition: !!items.rune,
            },
            {
                type: "select",
                slug: "material",
                label: items.transmute?.name,
                options: [{ value: "", label: "" }, ...materialOptions],
                empty: true,
                condition: !!items.transmute,
            },
        ];
    },
    process: ({ actor, items, rows, messages, addRule, flagItem, updateItem }) => {
        const weapon = actor.items.get<WeaponPF2e<CharacterPF2e>>(rows.weapon);
        if (!weapon) return;

        flagItem(weapon, localize("warshard.weapon"));

        const rune = rows.rune as WeaponPropertyRuneType | undefined;
        const material = rows.material as WeaponMaterialType | undefined;

        messages.add("warshard", {
            uuid: weapon.uuid,
            label: utils.getRunedItemName(weapon),
        });

        if (rune) {
            addRule(weapon, {
                key: "AdjustStrike",
                mode: "add",
                property: "property-runes",
                value: rune,
                definition: ["item:id:{item|_id}"],
                predicate: [{ gte: ["{actor|system.resources.mythicPoints.value}", 1] }],
            });

            messages.add("warshard", {
                label: items.rune?.name ?? localize("label.rune"),
                selected: utils.getWeaponPropertyRuneLabel(rune),
            });
        }

        if (material) {
            const actorLevel = actor.level;
            const weaponLevel = weapon.level;
            const { low, standard, high } = WEAPON_MATERIALS[material] ?? {};

            const grade =
                high && high <= actorLevel && weaponLevel >= 15
                    ? "high"
                    : standard && standard <= actorLevel && weaponLevel >= 9
                    ? "standard"
                    : low && low <= actorLevel
                    ? "low"
                    : undefined;

            if (grade) {
                const updates = {
                    _id: weapon.id,
                    "system.material": { type: material, grade } satisfies WeaponMaterialSource,
                };

                setFlagProperty(updates, "material", weapon._source.system.material);
                updateItem(updates);
            }
        }
    },
    rest: ({ actor, updateItem }) => {
        if (!hasItemWithSourceId(actor, TRANSMUTE_WEAPON_UUID, "feat")) return;

        for (const item of actor.itemTypes.weapon) {
            const data = getFlag<WeaponMaterialSource>(item, "material");
            if (!data) continue;

            const updates = {
                _id: item.id,
                "system.material": data,
            };

            unsetFlagProperty(updates, "material");
            updateItem(updates);
        }
    },
});

/**
 * https://github.com/foundryvtt/pf2e/blob/5d94764870656060475c57ad9ccb3803d3b528f1/src/module/actor/character/helpers.ts#L137-L153
 */
function getWeaponProficiencyRank(
    actor: CharacterPF2e,
    weapon: WeaponPF2e,
    itemOptions: Set<string>
): ZeroToFour {
    // If the character has an ancestral weapon familiarity or similar feature, it will make weapons that meet
    // certain criteria also count as weapon of different category
    const proficiencies = actor.system.proficiencies;
    const categoryRank = proficiencies.attacks[weapon.category]?.rank ?? 0;
    const groupRank = proficiencies.attacks[`weapon-group-${weapon.group}`]?.rank ?? 0;

    // Weapons that are interchangeable for all rules purposes (e.g., longbow and composite longbow)
    const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
    const baseWeapon = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
    const baseWeaponRank = proficiencies.attacks[`weapon-base-${baseWeapon}`]?.rank ?? 0;
    const syntheticRanks = Object.values(proficiencies.attacks)
        .filter((p): p is MartialProficiency => !!p?.definition?.test(itemOptions))
        .map((p) => p.rank);

    return Math.max(categoryRank, groupRank, baseWeaponRank, ...syntheticRanks) as ZeroToFour;
}

export { warshard };
