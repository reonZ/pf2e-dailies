import { getSourceId, includesSourceId } from '@utils/foundry/flags'
import { filterItemsWithSourceId, getItems } from '@utils/foundry/item'
import { hasLocalization, localize } from '@utils/foundry/localize'

export const RULE_TYPES = ['addedLanguage', 'trainedSkill', 'addedResistance', 'ganziHeritage', 'thaumaturgeTome'] as const
export const MINDSMITH_WEAPON_UUID = 'Compendium.pf2e-dailies.equipment.VpmEozw21aRxX15P'

export const CATEGORY_DATA = [
    // AddedFeat
    {
        type: 'addedFeat',
        category: 'metamagical',
        uuids: ['Compendium.pf2e.classfeatures.89zWKD2CN7nRu2xp'], // Metamagical Experimentation
    },
    // MindSmith
    {
        type: 'mindSmith',
        category: 'mindsmith',
        uuids: [
            'Compendium.pf2e.feats-srd.juikoiIA0Jy8PboY', // Mind Smith Dedication
            MINDSMITH_WEAPON_UUID, // Mind Weapon
            'Compendium.pf2e.feats-srd.PccekOihIbRWdDky', // Malleable Mental Forge
            'Compendium.pf2e.feats-srd.2uQbQgz1AbjzcFSp', // Runic Mind Smithing
            'Compendium.pf2e.feats-srd.fgnfXwFcn9jZlXGD', // Advanced Runic Mind Smithing
        ],
    },
    // TricksterAce
    {
        type: 'tricksterAce',
        category: 'ace',
        uuids: ['Compendium.pf2e.feats-srd.POrE3ZgBRdBL9MsW'], // Trickster's Ace
    },
    // ThaumaturgeTome
    {
        type: 'thaumaturgeTome',
        category: 'tome',
        uuids: [
            'Compendium.pf2e.classfeatures.MyN1cQgE0HsLF20e', // Tome
            'Compendium.pf2e.classfeatures.Obm4ItMIIr0whYeO', // Implement Adept
            'Compendium.pf2e.classfeatures.ZEUxZ4Ta1kDPHiq5', // Second Adept
            'Compendium.pf2e.feats-srd.yRRM1dsY6jakEMaC', // Intense Implement
            'Compendium.pf2e.classfeatures.QEtgbY8N2V4wTbsI', // Implement Paragon
        ],
    },
    // AddedResistance
    {
        type: 'addedResistance',
        category: 'elementalist',
        uuids: ['Compendium.pf2e.feats-srd.tx9pkrpmtqe4FnvS'], // Elementalist Dedication
    },
    // GanziHeritage
    {
        type: 'ganziHeritage',
        category: 'ganzi',
        uuids: ['Compendium.pf2e.heritages.3reGfXH0S82hM7Gp'], // Ganzi
    },
    // TrainedLore
    {
        type: 'trainedLore',
        category: 'study',
        uuids: ['Compendium.pf2e.feats-srd.aLJsBBZzlUK3G8MW'], // Quick Study
    },
    // TrainedSkill
    {
        type: 'trainedSkill',
        category: 'ageless',
        uuids: ['Compendium.pf2e.feats-srd.wylnETwIz32Au46y'], // Ageless Spirit
    },
    {
        type: 'trainedSkill',
        category: 'longevity',
        uuids: ['Compendium.pf2e.feats-srd.WoLh16gyDp8y9WOZ'], // Ancestral Longevity
    },
    {
        type: 'trainedSkill',
        category: 'memories',
        uuids: ['Compendium.pf2e.feats-srd.ptEOt3lqjxUnAW62'], // Ancient Memories
    },
    {
        type: 'trainedSkill',
        category: 'studies',
        uuids: ['Compendium.pf2e.feats-srd.9bgl6qYWKHzqWZj0'], // Flexible Studies
    },
    // AddedLanguage
    {
        type: 'addedLanguage',
        category: 'linguistics',
        uuids: ['Compendium.pf2e.feats-srd.eCWQU16hRLfN1KaX'], // Ancestral Linguistics
    },
    {
        type: 'addedLanguage',
        category: 'borts',
        uuids: ['Compendium.pf2e.equipment-srd.iS7hAQMAaThHYE8g'], // Bort's Blessing
    },
    // CombatFlexibility
    {
        type: 'combatFlexibility',
        category: 'flexibility',
        uuids: [
            'Compendium.pf2e.classfeatures.8g6HzARbhfcgilP8', // Combat Flexibility
            'Compendium.pf2e.classfeatures.W2rwudMNcAxs8VoX', // Improved Flexibility
        ],
    },
    // ScrollSavant
    {
        type: 'scrollSavant',
        category: 'savant',
        uuids: ['Compendium.pf2e.feats-srd.u5DBg0LrBUKP0JsJ'], // Scroll Savant
    },
    // ScrollChain
    {
        type: 'scrollChain',
        category: 'esoterica',
        uuids: [
            'Compendium.pf2e.feats-srd.OqObuRB8oVSAEKFR', // Scroll Esoterica
            'Compendium.pf2e.feats-srd.nWd7m0yRcIEVUy7O', // Elaborate Scroll Esoterica
            'Compendium.pf2e.feats-srd.LHjPTV5vP3MOsPPJ', // Grand Scroll Esoterica
        ],
    },
    {
        type: 'scrollChain',
        category: 'trickster',
        uuids: [
            'Compendium.pf2e.feats-srd.ROAUR1GhC19Pjk9C', // Basic Scroll Cache
            'Compendium.pf2e.feats-srd.UrOj9TROtn8nuxPf', // Expert Scroll Cache
            'Compendium.pf2e.feats-srd.lIg5Gzz7W70jfbk1', // Master Scroll Cache
        ],
    },
] as const

const { CATEGORIES, UUIDS, FIRST_FEATS, FIRST_EQUIPMENTS, FIRST_HERITAGES, RULES } = (() => {
    const CATEGORIES = {} as Record<CategoryName, ItemUUID[]>
    const UUIDS: Map<ItemUUID, Category & { index: number }> = new Map()
    const RULES: ItemUUID[] = []
    const FIRST_FEATS: ItemUUID[] = []
    const FIRST_EQUIPMENTS: ItemUUID[] = []
    const FIRST_HERITAGES: ItemUUID[] = []

    for (const { type, category, uuids } of CATEGORY_DATA) {
        const isRule = RULE_TYPES.includes(type as typeof RULE_TYPES[number])
        CATEGORIES[category] ??= []

        for (let index = 0; index < uuids.length; index++) {
            const uuid = uuids[index]
            CATEGORIES[category].push(uuid)
            UUIDS.set(uuid, { type, category, index })
            if (isRule) RULES.push(uuid)
        }

        // for fast check on any category
        const firstUUID = uuids[0]
        if (firstUUID.includes('equipment-srd')) FIRST_EQUIPMENTS.push(firstUUID)
        else if (firstUUID.includes('heritages')) FIRST_HERITAGES.push(firstUUID)
        else FIRST_FEATS.push(firstUUID)
    }

    return { CATEGORIES, UUIDS, FIRST_FEATS, FIRST_EQUIPMENTS, FIRST_HERITAGES, RULES }
})()

export function hasAnyCategory(actor: CharacterPF2e) {
    const itemTypes = actor.itemTypes
    return (
        // !!getRations(actor) ||
        actor.familiar ||
        itemTypes.heritage.some(item => includesSourceId(item, FIRST_HERITAGES)) ||
        itemTypes.feat.some(item => includesSourceId(item, FIRST_FEATS)) ||
        itemTypes.equipment.some(item => !(item.isInvested === false) && includesSourceId(item, FIRST_EQUIPMENTS))
    )
}

export function getCategoryUUIDS(category: CategoryName) {
    return CATEGORIES[category] as ItemUUID[]
}

export function getRuleItems(actor: CharacterPF2e) {
    return filterItemsWithSourceId(actor, RULES, ['feat', 'equipment', 'heritage'])
}

export function isRuleItem(item: ItemPF2e) {
    return includesSourceId(item, RULES)
}

type ReturnedCategory<C extends Category = Category> = C & {
    label: string
    items: [ItemPF2e, ...(undefined | ItemPF2e)[]]
}

type PreReturnedCategories = Partial<Record<CategoryName, Omit<ReturnedCategory, 'items'> & { items: (undefined | ItemPF2e)[] }>>

export function hasCategories(actor: CharacterPF2e) {
    const categories: PreReturnedCategories = {}
    const items = getItems(actor, ['heritage', 'feat', 'equipment', 'weapon'])

    for (const item of items) {
        const sourceId = getSourceId<ItemUUID>(item)
        if (!sourceId || (item.isOfType('equipment') && item.isInvested === false)) continue

        const entry = UUIDS.get(sourceId)
        if (!entry) continue

        const { category, index, type } = entry
        categories[category] ??= { category, type, label: '', items: [] }
        categories[category]!.items[index] = item

        if (index === 0) {
            const key = `label.${category}`
            const label = hasLocalization(key) ? localize(key) : item.name
            categories[category]!.label = label
        }
    }

    return Object.values(categories).filter(x => x.items[0]) as ReturnedCategory[]
}

export function isReturnedCategory<N extends CategoryType, C extends Category = ExtractedCategory<N>>(
    object: ReturnedCategory,
    category: N | N[]
): object is ReturnedCategory<C> {
    if (typeof category === 'string') return object.type === category
    return category.includes(object.type as N)
}
