import { R, localizePath } from "pf2e-api";
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
            slug: "good", // The Tenets of Good
            uuid: "Compendium.pf2e.classfeatures.Item.nxZYP3KGfTSkaW6J",
        },
        {
            slug: "evil", // The Tenets of Evil
            uuid: "Compendium.pf2e.classfeatures.Item.JiY2ZB4FkK8RJm4T",
        },
        {
            slug: "spirit", // Radiant Blade Spirit
            uuid: "Compendium.pf2e.feats-srd.Item.h5ksUZlrVGBjq6p4",
        },
        {
            slug: "master", // Radiant Blade Master
            uuid: "Compendium.pf2e.feats-srd.Item.jYEMVfrXJLpXS6aC",
        },
    ],
    label: (actor, items) => items.blade.name,
    rows: (actor, items) => {
        const weapons = actor.itemTypes.weapon.filter((weapon) => !weapon.isAlchemical);
        if (!weapons.length) return [];

        const isHoly = actor.traits.has("holy");
        const isUnholy = actor.traits.has("unholy");
        const runes: WeaponPropertyRuneType[] = [];

        runes.push("returning", "shifting");

        if (items.spirit) {
            runes.push("flaming");
            if (isHoly) runes.push("holy");
            if (isUnholy) runes.push("unholy");
        }

        if (items.master) {
            // greaterDisrupting = greaterVitalizing
            runes.push("dancing", "greaterDisrupting", "keen");
        }

        if (items.good) {
            // disrupting = vitalizing
            runes.push("ghostTouch", "disrupting");
        }

        if (items.evil) {
            runes.push("fearsome");
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
                label: localizePath("label.rune"),
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
