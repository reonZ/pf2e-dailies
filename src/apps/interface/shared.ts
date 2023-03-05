import { sequenceArray } from '@utils/utils'

export function getSimplifiableValue(actor: CharacterPF2e, value: number | 'half' | 'level') {
    if (typeof value === 'number') return value
    if (value === 'level') return actor.level
    return Math.max(1, Math.floor(actor.level / 2))
}

export function parseFeatFilter(actor: CharacterPF2e, filter: DailyFeatFilter) {
    const parsed = {
        feattype: [],
        skills: [],
        rarity: [],
        source: [],
        searchText: '',
        traits: {
            values: [],
            conjunction: 'and',
        },
        orderBy: 'level',
        orderDirection: 'asc',
        ...deepClone(filter),
    }

    if (parsed.level === undefined) {
        parsed.level = { min: 0, max: 20 }
    } else if (typeof parsed.level !== 'object') {
        parsed.level = { min: 0, max: getSimplifiableValue(actor, parsed.level) }
    } else {
        parsed.level = {
            min: getSimplifiableValue(actor, parsed.level.min ?? 0),
            max: getSimplifiableValue(actor, parsed.level.max ?? 0),
        }
    }

    return parsed as DeepRequired<InitialFeatFilters>
}

export function parseSpellFilter(actor: CharacterPF2e, filter: DailySpellFilter) {
    const parsed = {
        category: [],
        rarity: [],
        school: [],
        source: [],
        traditions: [],
        searchText: '',
        traits: {
            values: [],
            conjunction: 'and',
        },
        orderBy: 'level',
        orderDirection: 'asc',
        ...deepClone(filter),
    }

    if (parsed.level === undefined) {
        parsed.level = []
    } else if (!Array.isArray(parsed.level)) {
        parsed.level = sequenceArray(1, getSimplifiableValue(actor, parsed.level))
    }

    return parsed as DeepRequired<InitialSpellFilters>
}
