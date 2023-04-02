import { DailiesInterface } from '@apps/interface'
import { sequenceArray } from '@utils/utils'

export function getSimplifiableValue(actor: CharacterPF2e, value: number | 'half' | 'level' | undefined, fallback: number): number
export function getSimplifiableValue(
    actor: CharacterPF2e,
    value: number | 'half' | 'level' | undefined,
    fallback?: number
): number | undefined
export function getSimplifiableValue(
    actor: CharacterPF2e,
    value: number | 'half' | 'level' | undefined,
    fallback?: number
): number | undefined {
    if (value === undefined) return fallback
    if (typeof value === 'number') return value
    if (value === 'level') return actor.level
    if (value === 'half') return Math.max(1, Math.floor(actor.level / 2))
    const numbered = Number(value)
    return isNaN(numbered) ? fallback : numbered
}

export async function parseFilter(this: DailiesInterface, filter: DailyDropResultFilter) {
    return {
        type: filter.type,
        search: await (filter.type === 'feat'
            ? parseFeatFilter(this.actor, filter.search)
            : parseSpellFilter(this.actor, filter.search)),
        drop: filter.drop,
    } as DailyDropParsedFilter
}

function checkFilter(selected: (string | number)[] | undefined, checkbox: CheckboxData) {
    if (!selected?.length) return

    checkbox.selected = selected
    checkbox.isExpanded = true
    selected.forEach(x => (checkbox.options[x]!.selected = true))
}

function setTraits(searchTraits: BaseDailyFilter['traits'], dataTraits: MultiselectData) {
    const traits = getFilterTraits(searchTraits)
    if (traits?.selected.length) {
        dataTraits.conjunction = traits.conjunction
        dataTraits.selected = traits.selected
    }
}

export function getFilterTraits<V extends string>(traits: BaseDailyFilter<V>['traits']) {
    if (!traits) return

    const selected = Array.isArray(traits) ? traits : traits.selected
    if (!selected?.length) return

    return {
        selected: selected.map(x => (typeof x === 'string' ? { value: x } : x)),
        conjunction: (!Array.isArray(traits) && traits.conjunction) || 'and',
    }
}

async function parseSpellFilter(actor: CharacterPF2e, search: DailySpellFilter) {
    const data = await game.pf2e.compendiumBrowser.tabs.spell.getFilterData()

    checkFilter(search.category, data.checkboxes.category)
    checkFilter(search.school, data.checkboxes.school)
    checkFilter(search.traditions, data.checkboxes.traditions)
    checkFilter(search.rarity, data.checkboxes.rarity)
    checkFilter(search.source, data.checkboxes.source)

    setTraits(search.traits, data.multiselects.traits)

    const level = getSpellFilterLevel(actor, search.level)
    if (level?.length) checkFilter(level, data.checkboxes.level)

    return data
}

async function parseFeatFilter(actor: CharacterPF2e, search: DailyFeatFilter) {
    const data = await game.pf2e.compendiumBrowser.tabs.feat.getFilterData()

    checkFilter(search.category, data.checkboxes.category)
    checkFilter(search.skills, data.checkboxes.skills)
    checkFilter(search.rarity, data.checkboxes.rarity)
    checkFilter(search.source, data.checkboxes.source)

    setTraits(search.traits, data.multiselects.traits)

    const level = getFeatFilterLevel(actor, search.level)
    if (level) {
        data.sliders.level.values.min = level.min
        data.sliders.level.values.max = level.max
        data.sliders.level.isExpanded = true
    }

    return data
}

export function getSpellFilterLevel(actor: CharacterPF2e, level: DailySpellFilter['level']) {
    if (Array.isArray(level)) return level

    const simplified = getSimplifiableValue(actor, level)
    if (simplified) return sequenceArray(1, simplified)
}

export function getFeatFilterLevel(actor: CharacterPF2e, level: DailyFeatFilter['level']) {
    if (level === undefined) return

    if (typeof level === 'object') {
        return {
            min: getSimplifiableValue(actor, level.min, 0),
            max: getSimplifiableValue(actor, level.min, 20),
        }
    } else {
        return { min: 0, max: getSimplifiableValue(actor, level, 20) }
    }
}
