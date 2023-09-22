import { subLocalize } from '../../module'
import { getTranslatedSkills } from '../../pf2e/skills'
import { sluggify } from '../../pf2e/sluggify'
import { getFeatFilterLevel, getFilterTraits, getSpellFilterLevel } from './shared'

const localize = subLocalize('interface.error.drop')

export async function onDropFeat(item, target, filter) {
    if (!item.isOfType('feat')) return localize('notFeat')

    const { search, drop } = filter

    if (search.category?.length && !search.category.includes(item.category)) {
        return localize.warn('wrongType', { types: localizeAll('featCategories', search.category) })
    }

    if (search.traits) {
        const traits = getFilterTraits(search.traits)

        if (traits?.selected.length) {
            const testFn = traits.conjunction === 'or' ? 'some' : 'every'
            const test = traits.selected[testFn](trait => Number(trait.not ?? false) - Number(item.traits.has(trait.value)))
            if (!test) return localize.warn('wrongTraits')
        }
    }

    if (search.skills?.length) {
        const translatedSkills = getTranslatedSkills()
        const prerequisites = item.system.prerequisites.value.map(prerequisite => prerequisite.value.toLocaleLowerCase())
        const test = search.skills.some(skill =>
            prerequisites.some(prerequisite => prerequisite.includes(skill) || prerequisite.includes(translatedSkills[skill]))
        )
        if (!test) return localize.warn('wrongSkill', { skills: localizeAll('skillList', search.skills) })
    }

    if (search.rarity?.length && !search.rarity.includes(item.system.traits.rarity)) {
        return localize.warn('wrongRarity', { rarities: localizeAll('rarityTraits', search.rarity) })
    }

    if (search.source?.length && !search.source.includes(sluggify(item.system.source.value))) {
        return localize.warn('wrongSource', { sources: search.source.join(', ') })
    }

    const level = getFeatFilterLevel(this.actor, search.level)
    if (level) {
        const itemLevel = item.level
        if (itemLevel < level.min) return localize.warn('wrongLevelLow', { level: `min: ${level.min}` })
        else if (itemLevel > level.max) return localize.warn('wrongLevelHigh', { level: `max: ${level.max}` })
    }

    if (drop) {
        const args = this.dailyArgs[target.dataset.daily]
        if (args) {
            const result = await drop(item, args)
            if (typeof result === 'object') {
                if (result.data) return game.i18n.format(result.error, result.data)
                else return game.i18n.localize(result.error)
            } else if (result === false) {
                return localize.warn('wrongCustom')
            }
        }
    }

    onDropItem(item, target)
}

export async function onDropSpell(item, target, filter) {
    if (!item.isOfType('spell')) return localize('notSpell')

    const { search, drop } = filter

    if (search.category?.length) {
        const categories = search.category
            .map(x => game.i18n.localize(x === 'cantrip' ? 'PF2E.SpellCantripLabel' : CONFIG.PF2E.spellCategories[x]))
            .join(', ')

        if (
            (item.isCantrip && !search.category.includes('cantrip')) ||
            (item.isFocusSpell && !search.category.includes('focus')) ||
            (item.isRitual && !search.category.includes('ritual')) ||
            (!item.isCantrip && !item.isFocusSpell && !item.isRitual && !search.category.includes('spell'))
        ) {
            return localize.warn('wrongCategory', { categories })
        }
    }

    if (search.traits) {
        const traits = getFilterTraits(search.traits)

        if (traits?.selected.length) {
            const testFn = traits.conjunction === 'or' ? 'some' : 'every'
            const test = traits.selected[testFn](trait => Number(trait.not ?? false) - Number(item.traits.has(trait.value)))
            if (!test) return localize.warn('wrongTraits')
        }
    }

    if (search.traditions?.length) {
        if (!search.traditions.some(tradition => item.traditions.has(tradition))) {
            return localize.warn('wrongTradition', { traditions: localizeAll('magicTraditions', search.traditions) })
        }
    }

    const level = getSpellFilterLevel(this.actor, search.level)
    if (level?.length && !level.includes(item.level)) {
        return localize.warn('wrongLevel', { levels: level.join(', ') })
    }

    if (search.school?.length && !search.school.includes(item.school)) {
        return localize.warn('wrongSchool', { schools: localizeAll('magicSchools', search.school) })
    }

    if (search.rarity?.length && !search.rarity.includes(item.system.traits.rarity)) {
        return localize.warn('wrongRarity', { rarities: localizeAll('rarityTraits', search.rarity) })
    }

    if (search.source?.length && !search.source.includes(sluggify(item.system.source.value))) {
        return localize.warn('wrongSource', { sources: search.source.join(', ') })
    }

    if (drop) {
        const args = this.dailyArgs[target.dataset.daily]
        if (args) {
            const result = await drop(item, args)
            if (typeof result === 'object') {
                if (result.data) return ui.notifications.warn(game.i18n.format(result.error, result.data))
                else return ui.notifications.warn(game.i18n.localize(result.error))
            } else if (result === false) {
                return localize.warn('wrongCustom')
            }
        }
    }

    onDropItem(item, target)
}

function localizeAll(config, list) {
    const localized = list.map(key => game.i18n.localize(CONFIG.PF2E[config][key]))
    return localized.join(', ')
}

export function onDropItem(item, target) {
    target.value = item.name
    target.dataset.uuid = item.uuid
    target.nextElementSibling.nextElementSibling.classList.remove('disabled')
}
