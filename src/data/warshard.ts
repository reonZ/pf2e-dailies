import { createDaily } from "daily";
import {
    CharacterPF2e,
    localize,
    MartialProficiency,
    R,
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
    ],
    rows: (actor, items) => {
        const weapons = actor.itemTypes.weapon.filter((weapon) => {
            const options = new Set(weapon.getRollOptions("item"));
            const rank = getWeaponProficiencyRank(actor, weapon, options);

            return rank >= 2;
        });

        if (!weapons.length) return [];

        const actorLevel = actor.level;

        return [
            {
                type: "select",
                slug: "weapon",
                label: "TYPES.Item.weapon",
                options: weapons.map(({ id, name }) => ({ value: id, label: name })),
            },
            {
                type: "select",
                slug: "rune",
                label: items.rune?.name,
                options: R.pipe(
                    COMMON_WEAPON_RUNES,
                    R.filter(({ level }) => level <= actorLevel),
                    R.map(({ name, slug }) => ({ value: slug, label: name })),
                    R.sortBy(R.prop("label"))
                ),
                condition: !!items.rune,
            },
        ];
    },
    process: ({ actor, items, rows, messages, addRule, flagItem }) => {
        const weapon = actor.items.get<WeaponPF2e<CharacterPF2e>>(rows.weapon);
        if (!weapon) return;

        flagItem(weapon, localize("warshard.weapon"));

        const rune = rows.rune as WeaponPropertyRuneType;

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
