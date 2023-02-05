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
