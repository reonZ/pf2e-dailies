import { getSourceId, includesSourceId } from '@utils/foundry/flags'
import { filterItemsWithSourceId } from '@utils/foundry/item'
import { hasLocalization, localize } from '@utils/foundry/localize'

export const RULE_TYPES = ['addedLanguage', 'trainedSkill', 'addedResistance', 'thaumaturgeTome'] as const

export const CATEGORIES = [
    // TricksterAce
    {
        type: 'tricksterAce',
        category: 'ace',
        uuids: ['Compendium.pf2e.feats-srd.POrE3ZgBRdBL9MsW'],
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
        uuids: ['Compendium.pf2e.feats-srd.tx9pkrpmtqe4FnvS'],
    },
    {
        type: 'addedResistance',
        category: 'ganzi',
        uuids: ['Compendium.pf2e.heritages.3reGfXH0S82hM7Gp'],
    },
    // TrainedLore
    {
        type: 'trainedLore',
        category: 'study',
        uuids: ['Compendium.pf2e.feats-srd.aLJsBBZzlUK3G8MW'],
    },
    // TrainedSkill
    {
        type: 'trainedSkill',
        category: 'ageless',
        uuids: ['Compendium.pf2e.feats-srd.wylnETwIz32Au46y'],
    },
    {
        type: 'trainedSkill',
        category: 'longevity',
        uuids: ['Compendium.pf2e.feats-srd.WoLh16gyDp8y9WOZ'],
    },
    {
        type: 'trainedSkill',
        category: 'memories',
        uuids: ['Compendium.pf2e.feats-srd.ptEOt3lqjxUnAW62'],
    },
    {
        type: 'trainedSkill',
        category: 'studies',
        uuids: ['Compendium.pf2e.feats-srd.9bgl6qYWKHzqWZj0'],
    },
    // AddedLanguage
    {
        type: 'addedLanguage',
        category: 'linguistics',
        uuids: ['Compendium.pf2e.feats-srd.eCWQU16hRLfN1KaX'],
    },
    {
        type: 'addedLanguage',
        category: 'borts',
        uuids: ['Compendium.pf2e.equipment-srd.iS7hAQMAaThHYE8g'],
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
        uuids: ['Compendium.pf2e.feats-srd.u5DBg0LrBUKP0JsJ'],
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

type UuidsType = [ItemUUID, Omit<Category, 'uuids'> & { index: number }]
const [UUIDS, EQUIP_UUID, FEATS_UUID, HERITAGES_UUID, RULES_UUIDS, FLATTENED] = (() => {
    const UUIDS: UuidsType[] = []
    const FLATTENED = {} as Record<CategoryName, ItemUUID[]>
    const FEATS: ItemUUID[] = []
    const EQUIP: ItemUUID[] = []
    const HERITAGES: ItemUUID[] = []
    const RULES: ItemUUID[] = []

    for (const { type, category, uuids } of CATEGORIES) {
        FLATTENED[category] ??= []
        FLATTENED[category].push(...uuids)
        UUIDS.push(...uuids.map((uuid, index) => [uuid, { type, category, index }] as UuidsType))

        if (RULE_TYPES.includes(type as typeof RULE_TYPES[number])) RULES.push(...uuids)

        // for fast check on any category
        const firstUUID = uuids[0]
        if (firstUUID.includes('equipment-srd')) EQUIP.push(firstUUID)
        else if (firstUUID.includes('heritages')) HERITAGES.push(firstUUID)
        else FEATS.push(firstUUID)
    }

    return [new Map(UUIDS), EQUIP, FEATS, HERITAGES, RULES, FLATTENED]
})()

export function hasAnyCategory(actor: CharacterPF2e) {
    const itemTypes = actor.itemTypes
    return (
        itemTypes.heritage.some(item => includesSourceId(item, HERITAGES_UUID)) ||
        itemTypes.feat.some(item => includesSourceId(item, FEATS_UUID)) ||
        itemTypes.equipment.some(item => !(item.isInvested === false) && includesSourceId(item, EQUIP_UUID))
    )
}

export function getCategoryUUIDS(category: CategoryName) {
    return FLATTENED[category]
}

export function getRuleItems(actor: CharacterPF2e) {
    return filterItemsWithSourceId(actor, RULES_UUIDS, ['feat', 'equipment', 'heritage'])
}

export function isRuleItem(item: ItemPF2e) {
    return includesSourceId(item, RULES_UUIDS)
}

export function hasCategories(actor: CharacterPF2e) {
    const itemTypes = actor.itemTypes
    const categories = {} as Record<CategoryName, Omit<ReturnedCategory, 'items'> & { items: (undefined | ItemPF2e)[] }>
    const items = [...itemTypes.heritage, ...itemTypes.feat, ...itemTypes.equipment]

    for (const item of items) {
        const sourceId = getSourceId<ItemUUID>(item)
        if (!sourceId || (item.isOfType('equipment') && !item.isInvested)) continue

        const entry = UUIDS.get(sourceId)
        if (!entry) continue

        const { category, index, type } = entry
        categories[category] ??= { category, type, label: '', items: [] }
        categories[category].items[index] = item
        if (index === 0) {
            const key = `label.${category}`
            const label = hasLocalization(key) ? localize(key) : item.name
            categories[category].label = label
        }
    }

    return Object.values(categories).filter(x => x.items[0]) as ReturnedCategory[]
}

export function isCategory<N extends CategoryType, C extends Category = ExtractedCategory<N>>(
    object: ReturnedCategory,
    category: N
): object is ReturnedCategory<C> {
    return object.type === category
}
