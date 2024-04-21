import { createDaily } from "../daily";
import { utils } from "../utils";

type CustomRow = {
    rank: OneToFour;
    label: string;
    options: {
        value: SkillLongForm;
        label: string;
    }[];
};

const tomeUUID = "Compendium.pf2e.classfeatures.Item.MyN1cQgE0HsLF20e";

function itemCondition(actor: CharacterPF2e, item: ItemPF2e): Promisable<boolean> {
    const selected = utils.getChoiSetRuleSelection<string>(item);
    return actor.items.get(selected)?.sourceId === tomeUUID;
}

const thaumaturgeTome = createDaily({
    key: "thaumaturge-tome",
    items: [
        {
            slug: "tome", // Tome
            uuid: tomeUUID,
            required: true,
        },
        {
            slug: "adept", // Implement Adept
            uuid: "Compendium.pf2e.classfeatures.Item.Obm4ItMIIr0whYeO",
            condition: itemCondition,
        },
        {
            slug: "second", // Second Adept
            uuid: "Compendium.pf2e.classfeatures.Item.ZEUxZ4Ta1kDPHiq5",
            condition: itemCondition,
        },
        {
            slug: "intense", // Intense Implement
            uuid: "Compendium.pf2e.feats-srd.Item.yRRM1dsY6jakEMaC",
        },
        {
            slug: "paragon", // Implement Paragon
            uuid: "Compendium.pf2e.classfeatures.Item.QEtgbY8N2V4wTbsI",
            condition: itemCondition,
        },
    ],
    prepare: (actor, items) => {
        const actorLevel = actor.level;
        const actorSkills = actor.skills;
        const skillList = utils.getSkills();

        const custom: { first: CustomRow; second: CustomRow } = {
            first: { options: [], label: "", rank: 1 },
            second: { options: [], label: "", rank: 1 },
        } as const;

        const setCustom = (firstRank: OneToFour, secondRank: OneToFour) => {
            const options = skillList.filter(({ value }) => actorSkills[value].rank < firstRank);

            custom.first = {
                rank: firstRank,
                label: utils.getProficiencyLabel(firstRank),
                options: options,
            };

            custom.second = {
                rank: secondRank,
                label: utils.getProficiencyLabel(secondRank),
                options:
                    firstRank === secondRank
                        ? options
                        : skillList.filter(({ value }) => actorSkills[value].rank < secondRank),
            };
        };

        // Implement Paragon
        if (items.paragon) {
            setCustom(4, 4);
        }
        // Intense Implement or Second Adept or Implement Adept
        else if (items.intense || items.adept || items.second) {
            if (actorLevel >= 9) {
                setCustom(3, 3);
            } else {
                setCustom(2, 3);
            }
        }
        // Tome
        else {
            if (actorLevel >= 5) {
                setCustom(2, 2);
            } else if (actorLevel >= 3) {
                setCustom(1, 2);
            } else {
                setCustom(1, 1);
            }
        }

        return custom;
    },
    rows: (actor, items, custom) => {
        return [
            {
                type: "combo",
                slug: "first",
                label: utils.getProficiencyLabel(custom.first.rank),
                unique: `skill-${custom.first.rank}`,
                options: custom.first.options,
            },
            {
                type: "combo",
                slug: "second",
                label: utils.getProficiencyLabel(custom.second.rank),
                unique: `skill-${custom.second.rank}`,
                options: custom.second.options,
            },
        ];
    },
    process: ({ items, rows, custom, messages, addItem, addRule }) => {
        messages.addGroup("tome", undefined, 65);

        for (const slug of ["first", "second"] as const) {
            const rank = custom[slug].rank;
            let selected = rows[slug].selected;

            if (rows[slug].input) {
                const source = utils.createLoreSource({ name: selected, rank });
                addItem(source);
            } else {
                const skill = selected as SkillLongForm;
                const source = utils.createSkillRuleElement({
                    skill,
                    value: rank,
                });

                selected = utils.getSkillLabel(skill);
                addRule(items.tome, source);
            }

            messages.add("tome", {
                label: custom[slug].label,
                selected,
            });
        }
    },
});

export { thaumaturgeTome };
