import { MODULE, R } from "foundry-pf2e";
import { createDaily } from "../daily";
import { utils } from "../utils";

const bladeUUID = "Compendium.pf2e.classfeatures.Item.EtltLdiy9kNfHU0c";

const bladeAlly = createDaily({
    key: "blade-ally",
    items: [
        {
            slug: "blade", // Blade Ally
            uuid: bladeUUID,
            required: true,
        },
        {
            slug: "radiant", // Radiant Armament
            uuid: "Compendium.pf2e.feats-srd.Item.h5ksUZlrVGBjq6p4",
        },
        {
            slug: "paragon", // Armament Paragon
            uuid: "Compendium.pf2e.feats-srd.Item.jYEMVfrXJLpXS6aC",
        },
    ],
    label: (actor, items) => items.blade.name,
    rows: (actor, items) => {
        const weapons = actor.itemTypes.weapon.filter((weapon) => !weapon.isAlchemical);
        if (!weapons.length) return [];

        const runes: WeaponPropertyRuneType[] = [
            "fearsome",
            "ghostTouch",
            "returning",
            "shifting",
            "disrupting", // disrupting = vitalizing
        ];

        if (items.radiant) {
            runes.push("astral", "brilliant");

            if (actor.traits.has("holy")) {
                runes.push("holy");
            } else if (actor.traits.has("unholy")) {
                runes.push("unholy");
            }
        }

        if (items.paragon) {
            runes.push(
                "dancing", // dancing = animated
                "greaterFearsome",
                "grievous",
                "keen",
                "greaterDisrupting" // greaterDisrupting = greaterVitalizing
            );

            if (items.radiant) {
                runes.push("greaterAstral", "greaterBrilliant");
            }
        }

        return [
            {
                type: "select",
                slug: "weapon",
                label: "TYPES.Item.weapon",
                options: weapons.map((weapon) => ({ value: weapon.id, label: weapon.name })),
            },
            {
                type: "select",
                slug: "rune",
                label: MODULE.path("label.rune"),
                options: R.pipe(
                    runes,
                    R.map((rune) => ({
                        value: rune,
                        label: utils.getWeaponPropertyRuneLabel(rune),
                    })),
                    R.sortBy([R.prop("label"), "asc"])
                ),
            },
        ];
    },
    process: ({ actor, rows, messages, addRule }) => {
        const weaponId = rows.weapon;
        const rune = rows.rune as WeaponPropertyRuneType;

        const weapon = actor.items.get<WeaponPF2e<CharacterPF2e>>(weaponId);
        if (!weapon) return;

        const itemPredicate = [
            {
                or: ["item:category:{item|_id}", "item:id:{item|_id}"],
            },
        ];

        addRule(weapon, {
            key: "AdjustStrike",
            definition: itemPredicate,
            mode: "add",
            property: "property-runes",
            value: rune,
        });

        addRule(weapon, {
            key: "CriticalSpecialization",
            predicate: itemPredicate,
        });

        const label =
            weapon.name !== weapon._source.name ? `... ${weapon._source.name}` : weapon.name;

        messages.add("blade", {
            uuid: weapon.uuid,
            label,
            selected: utils.getWeaponPropertyRuneLabel(rune),
        });
    },
});

export { bladeAlly };
