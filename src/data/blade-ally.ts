import { createDaily } from "daily";
import { getActorWeapons, getItemFromUuid, MODULE, R, WeaponPropertyRuneType } from "module-helpers";
import { utils } from "utils";

const bladeUUID = "Compendium.pf2e.classfeatures.Item.EtltLdiy9kNfHU0c";

const bladeAlly = createDaily({
    key: "blade-ally",
    items: [
        {
            slug: "blade", // Blessed Armament
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
    label: (_actor, items) => items.blade.name,
    rows: (actor, items) => {
        const weapons = getActorWeapons(actor).filter((weapon) => !weapon.isAlchemical);
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
                "greaterDisrupting", // greaterDisrupting = greaterVitalizing
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
                options: weapons.map((weapon) => ({ value: weapon.uuid, label: weapon.name })),
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
                    R.sortBy([R.prop("label"), "asc"]),
                ),
            },
        ];
    },
    process: async ({ rows, messages, addRule, flagItem }) => {
        const weapon = await getItemFromUuid(rows.weapon, "weapon");
        if (!weapon) return;

        flagItem(weapon);

        const rune = rows.rune as WeaponPropertyRuneType;

        addRule(weapon, {
            key: "AdjustStrike",
            definition: ["item:id:{item|_id}"],
            mode: "add",
            property: "property-runes",
            value: rune,
        });

        addRule(weapon, {
            key: "CriticalSpecialization",
            predicate: ["item:id:{item|_id}"],
        });

        messages.add("blade", {
            uuid: weapon.uuid,
            label: utils.getRunedItemName(weapon),
            selected: utils.getWeaponPropertyRuneLabel(rune),
        });
    },
});

export { bladeAlly };
