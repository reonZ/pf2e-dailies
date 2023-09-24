import { DailiesInterface } from './apps/interface'
import { createWatchChatMessage } from './chat'
import { hasAnyDaily } from './dailies'
import { capitalize, getFlag, localize, sequenceArray, warn } from './module'
import { createSpellScroll } from './pf2e/spell'

const halfLevelString = 'max(1,floor(@actor.level/2))'

export const utils = {
    // Skills
    get skillNames() {
        return Object.keys(CONFIG.PF2E.skillList).slice()
    },
    skillLabel: skill => {
        return game.i18n.localize(CONFIG.PF2E.skillList[skill])
    },
    createSkillRuleElement: ({ skill, value, mode = 'upgrade', predicate }) => {
        const rule = {
            key: 'ActiveEffectLike',
            mode,
            path: `system.skills.${skill}.rank`,
            value,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    createLoreSource: ({ name, rank }) => {
        const data = {
            type: 'lore',
            img: 'systems/pf2e/icons/default-icons/lore.svg',
            name,
            system: { proficient: { value: rank } },
        }
        return data
    },
    // Languages
    get languageNames() {
        return Object.keys(CONFIG.PF2E.languages).slice()
    },
    languageLabel: language => {
        return game.i18n.localize(CONFIG.PF2E.languages[language])
    },
    createLanguageRuleElement: ({ language, mode = 'add', predicate }) => {
        const rule = {
            key: 'ActiveEffectLike',
            mode,
            path: 'system.traits.languages.value',
            value: language,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    // resistances
    resistanceLabel: (resistance, value) => {
        let str = game.i18n.localize(`PF2E.Trait${capitalize(resistance)}`)
        if (value) str += ` ${value}`
        return str
    },
    createResistanceRuleElement: ({ type, value, predicate }) => {
        if (value === 'half') value = halfLevelString
        const rule = {
            key: 'Resistance',
            type,
            value,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    // feats
    createFeatSource: async uuid => {
        const source = (await fromUuid(uuid))?.toObject()
        if (!source) throw new Error(`An error occured while trying to create a feat source with uuid: ${uuid}`)
        return source
    },
    // spells
    createSpellScrollSource: async ({ uuid, level }) => {
        const source = await createSpellScroll(uuid, level ?? false, true)
        if (!source) throw new Error(`An error occured while trying to create a spell scroll source with uuid: ${uuid}`)
        return source
    },
    createSpellSource: async uuid => {
        const source = (await fromUuid(uuid))?.toObject()
        if (!source) throw new Error(`An error occured while trying to create a spell source with uuid: ${uuid}`)
        return source
    },
    // Rule Elements
    get halfLevelString() {
        return halfLevelString
    },
    getChoiSetRuleSelection: (item, option) => {
        const rules = item._source.system.rules
        const rule = rules.find(rule => rule.key === 'ChoiceSet' && rule.rollOption === option)
        return rule?.selection
    },
    //
    proficiencyLabel: rank => {
        return game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank])
    },
    randomOption: async options => {
        const roll = (await new Roll(`1d${options.length}`).evaluate({ async: true })).total
        const result = options[roll - 1]
        if (typeof result === 'string') return result
        return result.value
    },
    halfLevelValue: actor => Math.max(1, Math.floor(actor.level / 2)),
    sequenceArray,
    // equipment
    damageLabel: damage => {
        return game.i18n.localize(CONFIG.PF2E.weaponDamage[damage])
    },
    weaponTraitLabel: trait => {
        return game.i18n.localize(CONFIG.PF2E.weaponTraits[trait])
    },
    weaponPropertyRunesLabel: rune => {
        return game.i18n.localize(CONFIG.PF2E.weaponPropertyRunes[rune])
    },
    hasFreePropertySlot: item => {
        const potency = item.system.runes.potency
        return potency > 0 && item.system.runes.property.length < potency
    },
    getFreePropertyRuneSlot: item => {
        const potency = item.system.potencyRune.value
        if (potency === null) return null

        for (let i = 0; i < potency; i++) {
            const property = RUNE_PROPERTY_KEYS[i]
            if (!item.system[property].value) return property
        }

        return null
    },
    // actor
    getPlayersActors: (member, ...types) => {
        if (!types.length) types = ['creature']
        let actors = game.actors

        if (member) {
            const members = game.actors.party?.members
            if (members?.includes(member)) actors = members

            if (member instanceof Actor) actors = actors.filter(a => a !== member)
        }

        return actors.filter(a => a.hasPlayerOwner && a.isOfType(...types))
    },
}

export function openDailiesInterface(actor, force) {
    if (!actor || !actor.isOfType('character') || !actor.isOwner) {
        const controlled = canvas.tokens.controlled
        actor = controlled.find(token => token.actor?.isOfType('character') && token.actor.isOwner)?.actor
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
