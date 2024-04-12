import { R, htmlElement, localize, localizePath, querySelector, subLocalize } from "pf2e-api";
import { createDaily } from "../daily";
import { DailyRowSelectOption } from "../types";
import { utils } from "../utils";

const mindUUID = "Compendium.pf2e.feats-srd.Item.juikoiIA0Jy8PboY";
const mentalUUID = "Compendium.pf2e.feats-srd.Item.PccekOihIbRWdDky";
const metallicUUID = "Compendium.pf2e.feats-srd.Item.8KUvJuAWCoxWg5FH";
const runicUUID = "Compendium.pf2e.feats-srd.Item.2uQbQgz1AbjzcFSp";
const advancedUUID = "Compendium.pf2e.feats-srd.Item.fgnfXwFcn9jZlXGD";

const weaponSlug = "mind-weapon";

const weaponBases: { die: DamageDieSize; traits: string[]; usage: WeaponUsage }[] = [
    { die: "d4", traits: ["finesse", "agile"], usage: "held-in-one-hand" },
    { die: "d6", traits: ["finesse"], usage: "held-in-one-hand" },
    { die: "d8", traits: [], usage: "held-in-one-hand" },
    { die: "d10", traits: ["reach"], usage: "held-in-two-hands" },
];

const weaponDamages = {
    slashing: "sword",
    bludgeoning: "club",
    piercing: "spear",
} as const;

const mentalForgeTraits = ["grapple", "modular", "nonlethal", "shove", "trip"] as const;

const metallicMaterials = ["cold-iron", "silver"] as const;

// disrupting = vitalizing
const runicRunes = ["corrosive", "disrupting", "flaming", "frost", "shock", "thundering"] as const;

// greaterDisrupting = greaterVitalizing
const advancedRunes = [
    "greaterCorrosive",
    "greaterDisrupting",
    "greaterFlaming",
    "greaterFrost",
    "greaterShock",
    "greaterThundering",
    "holy",
    "unholy",
] as const;

async function createMindWeapon(actor: CharacterPF2e) {
    const weaponLocalize = subLocalize("dialog.mind-weapon");

    const weaponRows = weaponBases.map(({ die, traits, usage }, i) => {
        const checked = i === 1 ? "checked" : "";
        const label = weaponLocalize("label", {
            die,
            hand: weaponLocalize(usage),
            hasTrait: traits.length
                ? weaponLocalize(traits.length === 1 ? "oneTrait" : "twoTraits", {
                      trait1: utils.getWeaponTraitLabel(traits[0]),
                      trait2: traits[1] ? utils.getWeaponTraitLabel(traits[1]) : "",
                  })
                : "",
        });

        return `<label>
            <input type="radio" name="type" value="${i}" ${checked}>
            ${label}
        </label>`;
    });

    const flavor = `<div class="flavor">${weaponLocalize("flavor")}</div>`;

    const potencyRunes = R.pipe(
        R.range(0, 5) as ZeroToFour[],
        R.map((i) => {
            const label = i ? utils.getWeaponPotencyRuneLabel(i) : "";
            return `<option value="${i}">${label}</option>`;
        })
    );

    const runeSelect = `<label class="runes">
        ${game.i18n.localize("PF2E.PotencyRuneLabel")}
        <select name="rune">
            ${potencyRunes.join("")}
        </select>
    </label>`;

    const selection = await Dialog.wait(
        {
            title: weaponLocalize("title"),
            content: flavor + weaponRows.join("") + runeSelect,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-save"></i>',
                    label: weaponLocalize("yes"),
                    callback: ($html) => {
                        const html = htmlElement($html);
                        const input = querySelector<HTMLInputElement>(
                            html,
                            "input[name='type']:checked"
                        );
                        const select = querySelector<HTMLSelectElement>(
                            html,
                            "select[name='rune']"
                        );

                        return {
                            type: Number(input.value),
                            rune: Number(select.value) as ZeroToFour,
                        };
                    },
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: weaponLocalize("no"),
                    callback: () => null,
                },
            },
            close: () => null,
        },
        { id: "pf2e-dailies-weapon", width: 600 }
    );

    if (selection === null) return false;

    const { die, traits, usage } = weaponBases[selection.type];

    const source: PreCreate<WeaponSource> = {
        type: "weapon",
        name: localize("mindsmith.weapon.name"),
        img: "systems/pf2e/icons/spells/disrupting-weapons.webp",
        system: {
            slug: weaponSlug,
            level: { value: actor.level },
            category: "martial",
            damage: {
                damageType: "slashing",
                die: die,
                dice: 1,
            },
            traits: {
                value: traits,
            },
            usage: {
                value: usage,
            },
            runes: {
                potency: selection.rune,
            },
        },
    };

    await actor.createEmbeddedDocuments("Item", [source]);

    return true;
}

function damageLabel(damage: keyof typeof weaponDamages) {
    const damageLabel = utils.getWeaponDamageLabel(damage);
    const groupLabel = utils.getWeaponGroupLabel(weaponDamages[damage]);
    return `${groupLabel} (${damageLabel})`;
}

const mindSmith = createDaily({
    key: "mind-smith",
    items: [
        {
            slug: "mind", // Mind Smith Dedication
            uuid: mindUUID,
            required: true,
        },
        {
            slug: "mental", // Malleable Mental Forge
            uuid: mentalUUID,
        },
        {
            slug: "metallic", // Metallic Envisionment
            uuid: metallicUUID,
        },
        {
            slug: "runic", // Runic Mind Smithing
            uuid: runicUUID,
        },
        {
            slug: "advanced", // Advanced Runic Mind Smithing
            uuid: advancedUUID,
        },
    ],
    label: (actor, items) => items.mind.name,
    rows: (actor, items) => {
        const weapon = actor.itemTypes.weapon.find((weapon) => weapon.slug === weaponSlug);

        if (!weapon) {
            return [
                {
                    type: "alert",
                    slug: "alert",
                    message: localize("interface.mindsmith.missing"),
                    resolve: () => createMindWeapon(actor),
                },
            ];
        }

        const selectThat = (that: string) => {
            return localize("label.select", {
                that: game.i18n.localize(that),
            });
        };

        const arrayToOptions = <T extends string>(
            truthy: boolean,
            arr: ReadonlyArray<T>,
            labelizer: (value: T) => string
        ): DailyRowSelectOption[] => {
            return truthy
                ? R.pipe(
                      arr,
                      R.map.strict((value) => ({
                          value,
                          label: labelizer(value),
                      })),
                      R.sortBy([R.prop("label"), "asc"])
                  )
                : [];
        };

        const mentalUniqueId = randomID();
        const mentalOptions = arrayToOptions(
            !!items.mental,
            mentalForgeTraits,
            utils.getWeaponTraitLabel
        );

        const canHaveRune =
            (!!items.runic || !!items.advanced) && utils.hasFreePropertySlot(weapon);

        return [
            {
                type: "select",
                slug: "damage",
                label: selectThat("PF2E.WeaponGroupLabel"),
                options: R.pipe(
                    R.keys.strict(weaponDamages),
                    R.map((damage) => ({
                        value: damage,
                        label: damageLabel(damage),
                    })),
                    R.sortBy([R.prop("label"), "asc"])
                ),
            },
            {
                type: "select",
                slug: `trait1`,
                label: "PF2E.NPC.AddTrait",
                options: mentalOptions,
                unique: mentalUniqueId,
                condition: !!items.mental,
            },
            {
                type: "select",
                slug: `trait2`,
                label: "PF2E.NPC.AddTrait",
                options: mentalOptions,
                unique: mentalUniqueId,
                condition: !!items.mental,
            },
            {
                type: "select",
                slug: "material",
                label: "PF2E.PreciousMaterialLabel",
                options: arrayToOptions(
                    !!items.metallic,
                    metallicMaterials,
                    utils.getPreciousMaterialLabel
                ),
                condition: !!items.metallic,
            },
            {
                type: "select",
                slug: "rune",
                label: localizePath("label.rune"),
                options: arrayToOptions(
                    canHaveRune,
                    items.advanced ? advancedRunes : runicRunes,
                    utils.getWeaponPropertyRuneLabel
                ),
                condition: canHaveRune,
            },
        ];
    },
    process: ({ actor, items, rows, messages, updateItem, addRule }) => {
        const weapon = actor.itemTypes.weapon.find((weapon) => weapon.slug === weaponSlug);
        if (!weapon) return;

        const damage = rows.damage as keyof typeof weaponDamages;

        updateItem({
            _id: weapon.id,
            "system.damage.damageType": damage,
            "system.group": weaponDamages[damage],
        });

        messages.add("mindsmith", {
            uuid: mindUUID,
            label: localize("label.mind-smith"),
            selected: damageLabel(damage),
        });

        const itemPredicate = [
            {
                or: ["item:category:{item|_id}", "item:id:{item|_id}"],
            },
        ];

        const traits = R.pipe(
            [1, 2] as const,
            R.map((i) => rows[`trait${i}`]),
            R.compact
        );

        for (const trait of traits) {
            addRule(weapon, {
                key: "ItemAlteration",
                itemType: "weapon",
                mode: "add",
                property: "traits",
                predicate: itemPredicate,
                value: trait,
            });
        }

        if (traits.length) {
            messages.add("mindsmith", {
                uuid: mentalUUID,
                label: localize("label.mind-mental"),
                selected: traits.map(utils.getWeaponTraitLabel).join(" & "),
            });
        }

        if (rows.material) {
            const material = rows.material as PreciousMaterialType;

            addRule(weapon, {
                key: "ItemAlteration",
                itemType: "weapon",
                mode: "override",
                property: "material-type",
                predicate: itemPredicate,
                value: material,
            });

            messages.add("mindsmith", {
                uuid: metallicUUID,
                selected: utils.getPreciousMaterialLabel(material),
            });
        }

        if (rows.rune && utils.hasFreePropertySlot(weapon)) {
            const rune = rows.rune as WeaponPropertyRuneType;

            addRule(weapon, {
                key: "AdjustStrike",
                definition: itemPredicate,
                mode: "add",
                property: "property-runes",
                value: rows.rune,
            });

            messages.add("mindsmith", {
                uuid: items.advanced ? advancedUUID : runicUUID,
                label: localize("label.mind-runic"),
                selected: utils.getWeaponPropertyRuneLabel(rune),
            });
        }
    },
});

export { mindSmith };
