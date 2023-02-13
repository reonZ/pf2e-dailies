import { sequenceArray } from '@utils/utils'

export const CATEGORY_SEARCH = {
    scrollChain: { category: ['spell'] } as InitialSpellFilters,
    combatFlexibility: { feattype: ['class'], traits: ['fighter'] } as InitialFeatFilters,
    scrollSavant: { category: ['spell'], traditions: ['arcane'] } as InitialSpellFilters,
    tricksterAce: { category: ['cantrip', 'spell'] } as InitialSpellFilters,
} as const

export function onSearch(event: JQuery.ClickEvent<any, any, SearchTemplateButton>) {
    event.preventDefault()

    const data = event.currentTarget.dataset
    const level = Number(data.level)

    switch (data.type) {
        case 'scrollChain':
            searchSpell({ ...CATEGORY_SEARCH.scrollChain, level: sequenceArray<OneToTen>(1, level) })
            break
        case 'combatFlexibility':
            searchFeat({ ...CATEGORY_SEARCH.combatFlexibility, level: { min: 1, max: level } })
            break
        case 'scrollSavant':
            searchSpell({ ...CATEGORY_SEARCH.scrollSavant, level: sequenceArray<OneToTen>(1, level) })
            break
        case 'tricksterAce':
            searchSpell({ ...CATEGORY_SEARCH.tricksterAce, level: sequenceArray<OneToTen>(1, level) })
            break
    }
}

function searchSpell({ category = [], level = [], traditions = [] }: InitialSpellFilters = {}) {
    const filter: InitialSpellFilters = {
        category,
        classes: [],
        level,
        rarity: [],
        school: [],
        source: [],
        traditions,
        traits: [],
    }
    game.pf2e.compendiumBrowser.openTab('spell', filter)
}

function searchFeat({ feattype = [], level = {}, traits = [] }: InitialFeatFilters = {}) {
    const filter: InitialFeatFilters = {
        feattype,
        skills: [],
        rarity: [],
        source: [],
        traits,
        level,
    }
    game.pf2e.compendiumBrowser.openTab('feat', filter)
}
