import { MODULE_ID } from '@utils/module'

export function createLongevityRule(skill: SkillLongForm) {
    return {
        key: 'ActiveEffectLike',
        mode: 'upgrade',
        path: `system.skills.${skill}.rank`,
        value: 1,
        [MODULE_ID]: true,
    } as const
}
