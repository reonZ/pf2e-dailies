import { DailiesInterface } from '@apps/interface'
import { getFlag } from '@utils/foundry/flags'
import { localize } from '@utils/foundry/localize'
import { warn } from '@utils/foundry/notification'
import { getChoiSetRuleSelection, getFreePropertyRuneSlot } from '@utils/pf2e/item'
import { LANGUAGE_LIST } from '@utils/pf2e/languages'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { createSpellScroll } from '@utils/pf2e/spell'
import { capitalize } from '@utils/string'
import { sequenceArray } from '@utils/utils'
import { createWatchChatMessage } from './chat'
import { hasAnyDaily } from './dailies'

const halfLevelString = 'max(1,floor(@actor.level/2))'

type CreateSkillArgs = { skill: string; value: ZeroToFour | string; mode?: AELikeChangeMode; predicate?: RawPredicate }
type CreateLanguageArgs = { language: string; mode?: AELikeChangeMode; predicate?: RawPredicate }
type CreateLoreArgs = { name: string; rank: OneToFour }
type CreateResistanceArgs = { type: string; value: number | string | 'half'; predicate?: RawPredicate }
type CreateScrollArgs = { uuid: ItemUUID; level?: OneToTen }

export const utils = {
    // Skills
    get skillNames() {
        return SKILL_LONG_FORMS.slice()
    },
    skillLabel: (skill: string) => {
        return game.i18n.localize(CONFIG.PF2E.skillList[skill as SkillLongForm])
    },
    createSkillRuleElement: ({ skill, value, mode = 'upgrade', predicate }: CreateSkillArgs) => {
        const rule: AELikeSource = {
            key: 'ActiveEffectLike',
            mode,
            path: `system.skills.${skill}.rank`,
            value,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    createLoreSource: ({ name, rank }: CreateLoreArgs) => {
        const data: DeepPartial<LoreSource> = {
            type: 'lore',
            img: 'systems/pf2e/icons/default-icons/lore.svg',
            name,
            system: { proficient: { value: rank as OneToFour } },
        }
        return data
    },
    // Languages
    get languageNames() {
        return LANGUAGE_LIST.slice()
    },
    languageLabel: (language: string) => {
        return game.i18n.localize(CONFIG.PF2E.languages[language as Language])
    },
    createLanguageRuleElement: ({ language, mode = 'add', predicate }: CreateLanguageArgs) => {
        const rule: AELikeSource = {
            key: 'ActiveEffectLike',
            mode,
            path: 'system.traits.languages.value',
            value: language,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    // resistances
    resistanceLabel: (resistance: string, value?: number) => {
        let str = game.i18n.localize(`PF2E.Trait${capitalize(resistance)}`)
        if (value) str += ` ${value}`
        return str
    },
    createResistanceRuleElement: ({ type, value, predicate }: CreateResistanceArgs) => {
        if (value === 'half') value = halfLevelString
        const rule: IWRRuleElementSource = {
            key: 'Resistance',
            type,
            value,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    // feats
    createFeatSource: async (uuid: ItemUUID) => {
        const source = (await fromUuid<FeatPF2e>(uuid))?.toObject()
        if (!source) throw new Error(`An error occured while trying to create a feat source with uuid: ${uuid}`)
        return source
    },
    // spells
    createSpellScrollSource: async ({ uuid, level }: CreateScrollArgs) => {
        const source = await createSpellScroll(uuid, level ?? false, true)
        if (!source) throw new Error(`An error occured while trying to create a spell scroll source with uuid: ${uuid}`)
        return source
    },
    createSpellSource: async (uuid: ItemUUID) => {
        const source = (await fromUuid<SpellPF2e>(uuid))?.toObject()
        if (!source) throw new Error(`An error occured while trying to create a spell source with uuid: ${uuid}`)
        return source
    },
    // Rule Elements
    get halfLevelString() {
        return halfLevelString
    },
    getChoiSetRuleSelection,
    //
    proficiencyLabel: (rank: ZeroToFour) => {
        return game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank])
    },
    randomOption: async <T extends string | { value: string }>(options: T[]) => {
        const roll = (await new Roll(`1d${options.length}`).evaluate({ async: true })).total
        const result = options[roll - 1]!
        if (typeof result === 'string') return result
        return result.value
    },
    halfLevelValue: (actor: CharacterPF2e) => Math.max(1, Math.floor(actor.level / 2)),
    sequenceArray,
    // equipment
    damageLabel: (damage: string) => {
        return game.i18n.localize(CONFIG.PF2E.weaponDamage[damage as WeaponDamageType])
    },
    weaponTraitLabel: (trait: string) => {
        return game.i18n.localize(CONFIG.PF2E.weaponTraits[trait as WeaponTrait])
    },
    weaponPropertyRunesLabel: (rune: string) => {
        return game.i18n.localize(CONFIG.PF2E.weaponPropertyRunes[rune as WeaponPropertyRuneType])
    },
    hasFreePropertySlot: (item: WeaponPF2e | ArmorPF2e) => {
        const potency = item.system.runes.potency
        return potency > 0 && item.system.runes.property.length < potency
    },
    getFreePropertyRuneSlot,
}

export function openDailiesInterface(actor?: ActorPF2e | CharacterPF2e | null, force?: boolean) {
    if (!actor || !actor.isOfType('character') || !actor.isOwner) {
        const controlled = canvas.tokens.controlled
        actor = controlled.find(token => token.actor?.isOfType('character') && token.actor.isOwner)?.actor as
            | CharacterPF2e
            | undefined
        if (!actor) actor = game.user.character
    }

    if (!actor || !actor.isOfType('character') || !actor.isOwner) return warn('error.noCharacterSelected')

    if (getFlag(actor, 'rested') !== true) return warn('error.unrested')
    if (!force && !hasAnyDaily(actor)) return warn('error.noDailies')

    new DailiesInterface(actor, { title: localize('interface.title', { name: actor.name }) }).render(true)
}

export function requestDailies() {
    if (!game.user.isGM) return warn('error.notGM')
    createWatchChatMessage()
}
