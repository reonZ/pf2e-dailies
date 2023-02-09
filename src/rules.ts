import { MODULE_ID } from '@utils/module'

export function createTrainedSkillRule(skill: SkillLongForm) {
    return {
        key: 'ActiveEffectLike',
        mode: 'upgrade',
        path: `system.skills.${skill}.rank`,
        value: 1,
        [MODULE_ID]: true,
    } as const
}

export function createLanguageRule(language: Language) {
    return {
        key: 'ActiveEffectLike',
        mode: 'add',
        path: 'system.traits.languages.value',
        value: language,
        [MODULE_ID]: true,
    } as const
}

// {
//     "key": "GrantItem",
//     "uuid": "Compendium.pf2e.feats-srd.5FyvwI24mnROzh61",
//     "flag": "combatAssessment"
//   }

/**
 * flags.pf2e.itemGrants.combatAssessment = {id: feat.id, onDelete: 'detach'}
 */

/**
 * flags.pf2e.grantedBy = {id: parent.id, onDelete: "cascade"}
 */
