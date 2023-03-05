import { DailiesInterface } from '@apps/interface'
import { subLocalize } from '@utils/foundry/localize'
import { getTranslatedSkills } from '@utils/pf2e/skills'
import { sluggify } from '@utils/pf2e/utils'

const localize = subLocalize('interface.error.drop')

export async function onDropFeat(
    this: DailiesInterface,
    item: ItemPF2e,
    target: HTMLInputElement,
    filter: DailyRowDropParsedFeat
) {
    if (!item.isOfType('feat')) return localize('notFeat')

    const { featType, traits, system, level } = item
    const { search, drop } = filter

    if (search.feattype.length && !search.feattype.includes(featType)) {
        return localize.warn('wrongType', { types: localizeAll('featTypes', search.feattype) })
    }

    if (search.traits.values.length) {
        const conjunction = search.traits.conjunction ?? 'and'
        const testFn = conjunction === 'or' ? 'some' : 'every'
        const test = search.traits.values[testFn](trait => traits.has(trait))
        if (!test) {
            return localize.warn(conjunction === 'or' ? 'wrongTraitOr' : 'wrongTraitAnd', {
                traits: localizeAll('featTraits', search.traits.values),
            })
        }
    }

    if (search.skills.length) {
        const translatedSkills = getTranslatedSkills()
        const prerequisites = system.prerequisites.value.map(prerequisite => prerequisite.value.toLocaleLowerCase())
        const test = search.skills.some(skill =>
            prerequisites.some(prerequisite => prerequisite.includes(skill) || prerequisite.includes(translatedSkills[skill]!))
        )
        if (!test) return localize.warn('wrongSkill', { skills: localizeAll('skillList', search.skills) })
    }

    if (search.rarity.length && !search.rarity.includes(system.traits.rarity)) {
        return localize.warn('wrongRarity', { rarities: localizeAll('rarityTraits', search.rarity) })
    }

    if (search.source.length && !search.source.includes(sluggify(system.source.value))) {
        return localize.warn('wrongSource', { sources: search.source.join(', ') })
    }

    const { min, max } = search.level
    if (level < min) return localize.warn('wrongLevelLow', { level: `min: ${min}` })
    else if (level > max) return localize.warn('wrongLevelHigh', { level: `max: ${max}` })

    if (drop) {
        const args = this.dailyArgs[target.dataset.daily!]
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

export async function onDropSpell(
    this: DailiesInterface,
    item: ItemPF2e,
    target: HTMLInputElement,
    filter: DailyRowDropParsedSpell
) {
    if (!item.isOfType('spell')) return localize('notSpell')

    const { system, level, traits, traditions, school } = item
    const { search, drop } = filter

    if (search.category.length) {
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

    if (search.traits.values.length) {
        const conjunction = search.traits.conjunction ?? 'and'
        const testFn = conjunction === 'or' ? 'some' : 'every'
        const test = search.traits.values[testFn](trait => traits.has(trait))
        if (!test) {
            return localize.warn(conjunction === 'or' ? 'wrongTraitOr' : 'wrongTraitAnd', {
                traits: localizeAll('spellTraits', search.traits.values),
            })
        }
    }

    if (search.traditions.length) {
        if (!search.traditions.some(tradition => traditions.has(tradition))) {
            return localize.warn('wrongTradition', { traditions: localizeAll('magicTraditions', search.traditions) })
        }
    }

    if (search.level.length && !search.level.includes(level)) {
        return localize.warn('wrongLevel', { levels: search.level.join(', ') })
    }

    if (search.school.length && !search.school.includes(school)) {
        return localize.warn('wrongSchool', { schools: localizeAll('magicSchools', search.school) })
    }

    if (search.rarity.length && !search.rarity.includes(system.traits.rarity)) {
        return localize.warn('wrongRarity', { rarities: localizeAll('rarityTraits', search.rarity) })
    }

    if (search.source.length && !search.source.includes(sluggify(system.source.value))) {
        return localize.warn('wrongSource', { sources: search.source.join(', ') })
    }

    if (drop) {
        const args = this.dailyArgs[target.dataset.daily!]
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

function localizeAll<
    C extends keyof Omit<PF2ECONFIG, 'proficiencyLevels'>,
    K extends keyof Omit<PF2ECONFIG, 'proficiencyLevels'>[C]
>(config: C, list: K[]): string {
    const localized = list.map(key => game.i18n.localize(CONFIG.PF2E[config][key] as unknown as string))
    return localized.join(', ')
}

export function onDropItem(item: ItemPF2e, target: HTMLInputElement) {
    target.value = item.name
    target.dataset.uuid = item.uuid
    target.nextElementSibling!.nextElementSibling!.classList.remove('disabled')
}
