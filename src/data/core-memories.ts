import { createDaily } from "daily";
import { ChoiceSetRuleElement, FeatPF2e, R, SkillSlug } from "module-helpers";
import { utils } from "utils";

const ASSURANCE_UUID = "Compendium.pf2e.feats-srd.Item.W6Gl9ePmItfDHji0";
const AUTOMATIC_KNOWLEDGE_UUID = "Compendium.pf2e.feats-srd.Item.H3I2X0f7v4EzwxuN";

const RK_SKILLS = ["arcana", "crafting", "nature", "occultism", "religion", "society"] as const;

const coreMemories = createDaily({
    key: "core-memories",
    items: [
        {
            slug: "core", // Core Memories
            uuid: "Compendium.sf2e-anachronism.class-features.Item.ENxkQJEIkz35yuMT",
            required: true,
        },
    ],
    label: (actor, items) => items.core.name,
    rows: (actor, {}) => {
        const skillList = utils.getSkills();
        const actorSkills = actor.skills;

        return [
            {
                slug: "skill",
                type: "select",
                options: skillList.filter(({ value }) => actorSkills[value].rank >= 1),
            },
        ];
    },
    process: async ({ actor, items, messages, rows, addFeat }) => {
        const slug = rows.skill as SkillSlug;
        const skill = actor.skills[slug];
        const assurance = (await fromUuid<FeatPF2e>(ASSURANCE_UUID))?.toObject();
        if (!assurance) return;

        const rule = (assurance.system.rules as ChoiceSetRuleElement[]).find(
            (rule) => rule.flag === "assurance"
        );

        if (rule) {
            rule.selection = slug;
        }

        addFeat(assurance, items.core);
        messages.add("memories", { sourceId: ASSURANCE_UUID });

        if (skill.rank > 1 && R.isIncludedIn(slug, RK_SKILLS)) {
            const knowledge = (await fromUuid<FeatPF2e>(AUTOMATIC_KNOWLEDGE_UUID))?.toObject();

            if (knowledge) {
                const label = game.i18n.localize(CONFIG.PF2E.skills[slug].label);
                knowledge.name += ` (${label})`;

                knowledge.system.actionType.value = "free";

                addFeat(knowledge, items.core);
                messages.add("memories", { sourceId: AUTOMATIC_KNOWLEDGE_UUID });
            }
        }
    },
});

export { coreMemories };
