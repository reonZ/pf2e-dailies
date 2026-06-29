import { createDaily } from "daily";
import { ChoiceSetRuleElement, FeatPF2e, R, SkillSlug, SYSTEM } from "foundry-helpers";
import { utils } from "utils";

const ASSURANCE_UUID = SYSTEM.itemUuid(
    "Compendium.pf2e.feats-srd.Item.W6Gl9ePmItfDHji0",
    "Compendium.sf2e.feats.Item.W6Gl9ePmItfDHji0",
);

const AUTOMATIC_KNOWLEDGE_UUID = SYSTEM.itemUuid(
    "Compendium.pf2e.feats-srd.Item.H3I2X0f7v4EzwxuN",
    "Compendium.sf2e.feats.Item.H3I2X0f7v4EzwxuN",
);

const RK_SKILLS = ["arcana", "computers", "crafting", "nature", "occultism", "religion", "society"] as SkillSlug[];

const coreMemories = createDaily({
    key: "core-memories",
    items: [
        {
            slug: "core", // Core Memories
            uuid: SYSTEM.itemUuid(
                "Compendium.sf2e-anachronism.class-features.Item.ENxkQJEIkz35yuMT",
                "Compendium.sf2e.class-features.Item.ENxkQJEIkz35yuMT",
            ),
            required: true,
        },
    ],
    label: (_actor, items) => items.core.name,
    rows: (actor) => {
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
        const assuranceUUID = ASSURANCE_UUID();
        const automaticKnowledgeUUID = AUTOMATIC_KNOWLEDGE_UUID();
        const slug = rows.skill as SkillSlug;
        const skill = actor.skills[slug];
        const assurance = (await fromUuid<FeatPF2e>(assuranceUUID))?.toObject();
        if (!assurance) return;

        const rule = (assurance.system.rules as ChoiceSetRuleElement[]).find((rule) => rule.flag === "assurance");

        if (rule) {
            rule.selection = slug;
        }

        addFeat(assurance, items.core);
        messages.add("memories", { sourceId: assuranceUUID });

        if (skill.rank > 1 && R.isIncludedIn(slug, RK_SKILLS)) {
            const knowledge = (await fromUuid<FeatPF2e>(automaticKnowledgeUUID))?.toObject();

            if (knowledge) {
                const label = game.i18n.localize(CONFIG.PF2E.skills[slug].label);
                knowledge.name += ` (${label})`;

                knowledge.system.actionType.value = "free";

                addFeat(knowledge, items.core);
                messages.add("memories", { sourceId: automaticKnowledgeUUID });
            }
        }
    },
});

export { coreMemories };
