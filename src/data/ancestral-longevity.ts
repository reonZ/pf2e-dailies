import { SkillSlug } from "module-helpers";
import { createDaily } from "../daily";
import { DailyRowComboData } from "../types";
import { utils } from "../utils";

const ancestralUUID = "Compendium.pf2e.feats-srd.Item.WoLh16gyDp8y9WOZ";
const expertUUID = "Compendium.pf2e.feats-srd.Item.vfuHVSuExvtyajkW";

const ancestralLongevity = createDaily({
    key: "ancestral-longevity",
    items: [
        {
            slug: "trained", // Ancestral Longevity
            uuid: ancestralUUID,
            required: true,
        },
        {
            slug: "expert", // Expert Longevity
            uuid: expertUUID,
        },
    ],
    label: (actor, items) => items.trained.name,
    rows: (actor, items) => {
        const skillList = utils.getSkills();
        const actorSkills = actor.skills;

        return [
            {
                slug: "trained",
                type: "combo",
                label: "PF2E.ProficiencyLevel1",
                unique: "skill-1",
                options: skillList.filter(({ value }) => actorSkills[value].rank === 0),
            },
            {
                slug: "expert",
                type: "combo",
                label: "PF2E.ProficiencyLevel2",
                unique: "skill-2",
                options: skillList.filter(({ value }) => actorSkills[value].rank === 1),
                condition: !!items.expert,
            },
        ];
    },
    process: ({ items, rows, messages, addItem, addRule, removeRule }) => {
        const data = [
            ["trained", 1, ancestralUUID],
            ["expert", 2, expertUUID],
        ] as const;

        for (const [slug, rank, uuid] of data) {
            const row: DailyRowComboData | undefined = rows[slug];
            const item = items[slug];

            if (!row || !item) continue;

            removeRule(item, () => true);

            let selected = row.selected;

            if (row.input) {
                const source = utils.createLoreSource({ name: selected, rank });
                addItem(source);
            } else {
                const skill = selected as SkillSlug;
                const source = utils.createSkillRuleElement({
                    skill,
                    value: rank,
                });

                selected = utils.getSkillLabel(skill);
                addRule(item, source);
            }

            messages.add("skills", { uuid, selected });
        }
    },
});

export { ancestralLongevity };
