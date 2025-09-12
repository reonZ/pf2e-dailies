import { createDaily } from "daily";
import { OneToFour, SkillSlug, ZeroToFour } from "module-helpers";
import { utils } from "utils";

function createComboSkillDaily(
    key: string,
    uuid: string,
    {
        rank = 1,
        removeRules = true,
        label,
    }: { label?: string; rank?: OneToFour; removeRules?: boolean } = {}
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
        label: (actor, items) => label ?? items.item.name,
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
                const skill = selected as SkillSlug;
                const source = utils.createSkillRuleElement({
                    skill,
                    value: rank,
                });

                selected = utils.getSkillLabel(skill);
                addRule(items.item, source);
            }

            messages.add("skills", { uuid: items.item, selected });
        },
    });
}

function createLoreSkillDaily(
    key: string,
    uuid: string,
    { label, rank = 1 }: { label?: string; rank?: ZeroToFour } = {}
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
        label: (actor, items) => label ?? items.item.name,
        rows: () => {
            return [
                {
                    type: "input",
                    slug: "lore",
                },
            ];
        },
        process: ({ items, rows, messages, addItem }) => {
            const source = utils.createLoreSource({ name: rows.lore, rank });
            addItem(source);
            messages.add("skills", { uuid: items.item, selected: rows.lore });
        },
    });
}

export { createComboSkillDaily, createLoreSkillDaily };
