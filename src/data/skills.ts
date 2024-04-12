import { createDaily } from "../daily";
import { utils } from "../utils";

function createComboSkillDaily(
    key: string,
    uuid: string,
    { rank = 1, removeRules = true }: { rank?: OneToFour; removeRules?: boolean } = {}
) {
    return createDaily({
        key,
        items: [
            {
                slug: "item",
                uuid,
                required: true,
            },
        ],
        label: (actor, items) => items.item.name,
        rows: (actor) => {
            const skillList = utils.getSkills();
            const actorSkills = actor.skills;
            const options = skillList.filter(({ value }) => actorSkills[value].rank === rank - 1);

            return [
                {
                    slug: "skill",
                    type: "combo",
                    label: "PF2E.ProficiencyLevel1",
                    unique: `skill-${rank}`,
                    options,
                },
            ];
        },
        process: ({ rows, items, messages, addItem, addRule, removeRule }) => {
            let selected = rows.skill.selected;

            if (removeRules) {
                removeRule(items.item, () => true);
            }

            if (rows.skill.input) {
                const source = utils.createLoreSource({ name: selected, rank });
                addItem(source);
            } else {
                const skill = selected as SkillLongForm;
                const source = utils.createSkillRuleElement({
                    skill,
                    value: rank,
                });

                selected = utils.getSkillLabel(skill);
                addRule(items.item, source);
            }

            messages.add("skills", { uuid, selected });
        },
    });
}

function createLoreSkillDaily(key: string, uuid: string) {
    return createDaily({
        key,
        items: [
            {
                slug: "item",
                uuid,
                required: true,
            },
        ],
        label: (actor, items) => items.item.name,
        rows: () => {
            return [
                {
                    type: "input",
                    slug: "lore",
                },
            ];
        },
        process: ({ rows, messages, addItem }) => {
            const source = utils.createLoreSource({ name: rows.lore, rank: 1 });
            addItem(source);
            messages.add("skills", { uuid, selected: rows.lore });
        },
    });
}

export { createComboSkillDaily, createLoreSkillDaily };
