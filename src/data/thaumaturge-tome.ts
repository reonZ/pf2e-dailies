import { createDaily } from "daily";
import { OneToFour, SkillSlug } from "module-helpers";
import { utils } from "utils";

type CustomRow = {
    rank: OneToFour;
    label: string;
    options: {
        value: SkillSlug;
        label: string;
    }[];
};

const thaumaturgeTome = createDaily({
    key: "thaumaturge-tome",
    items: [
        {
            slug: "tome", // Initiate Benefit (Tome)
            uuid: "Compendium.pf2e.classfeatures.Item.oADE2kM43wpF7MT5",
            required: true,
        },
        {
            slug: "adept", // Adept Benefit (Tome)
            uuid: "Compendium.pf2e.classfeatures.Item.gR8ODlO6au0laXo4",
        },
        {
            slug: "intense", // Intense Implement
            uuid: "Compendium.pf2e.feats-srd.Item.yRRM1dsY6jakEMaC",
        },
        {
            slug: "paragon", // Paragon Benefit (Tome)
            uuid: "Compendium.pf2e.classfeatures.Item.IGv5wS17AAi0U87W",
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
        else if (items.intense || items.adept) {
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
    process: ({ items, rows, custom, messages, addItem, addRule, removeRule }) => {
        messages.addGroup("tome", undefined, 65);

        removeRule(items.tome, (rule) => rule.key !== "FlatModifier");

        for (const slug of ["first", "second"] as const) {
            const rank = custom[slug].rank;
            let selected = rows[slug].selected;

            if (rows[slug].input) {
                const source = utils.createLoreSource({ name: selected, rank });
                addItem(source);
            } else {
                const skill = selected as SkillSlug;
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
