import { getSourceId, includesSourceId } from '@utils/foundry/flags'
import { filterItemsWithSourceId } from '@utils/foundry/item'

export const RULE_TYPES = ['addedLanguage', 'trainedSkill'] as const

export const CATEGORIES = [
    // TrainedLore
    {
        type: 'trainedLore',
        category: 'study',
        label: '',
        uuids: ['Compendium.pf2e.feats-srd.aLJsBBZzlUK3G8MW'],
    },
    // TrainedSkill
    {
        type: 'trainedSkill',
        category: 'ageless',
        label: '',
        uuids: ['Compendium.pf2e.feats-srd.wylnETwIz32Au46y'],
    },
    {
        type: 'trainedSkill',
        category: 'longevity',
        label: '',
        uuids: ['Compendium.pf2e.feats-srd.WoLh16gyDp8y9WOZ'],
    },
    {
        type: 'trainedSkill',
        category: 'memories',
        label: '',
        uuids: ['Compendium.pf2e.feats-srd.ptEOt3lqjxUnAW62'],
    },
    {
        type: 'trainedSkill',
        category: 'studies',
        label: '',
        uuids: ['Compendium.pf2e.feats-srd.9bgl6qYWKHzqWZj0'],
    },
    // AddedLanguage
    {
        type: 'addedLanguage',
        category: 'linguistics',
        label: '',
        uuids: ['Compendium.pf2e.feats-srd.eCWQU16hRLfN1KaX'],
    },
    {
        type: 'addedLanguage',
        category: 'borts',
        label: '',
        uuids: ['Compendium.pf2e.equipment-srd.iS7hAQMAaThHYE8g'],
    },
    // CombatFlexibility
    {
        type: 'combatFlexibility',
        category: 'flexibility',
        label: '',
        uuids: ['Compendium.pf2e.classfeatures.8g6HzARbhfcgilP8', 'Compendium.pf2e.classfeatures.W2rwudMNcAxs8VoX'],
    },
    // ScrollSavant
    {
        type: 'scrollSavant',
        category: 'savant',
        label: '',
        uuids: ['Compendium.pf2e.feats-srd.u5DBg0LrBUKP0JsJ'],
    },
    // ScrollChain
    {
        type: 'scrollChain',
        category: 'esoterica',
        label: '',
        uuids: [
            'Compendium.pf2e.feats-srd.OqObuRB8oVSAEKFR',
            'Compendium.pf2e.feats-srd.nWd7m0yRcIEVUy7O',
            'Compendium.pf2e.feats-srd.LHjPTV5vP3MOsPPJ',
        ],
    },
    {
        type: 'scrollChain',
        category: 'trickster',
        label: 'Scroll Trickster',
        uuids: [
            'Compendium.pf2e.feats-srd.ROAUR1GhC19Pjk9C',
            'Compendium.pf2e.feats-srd.UrOj9TROtn8nuxPf',
            'Compendium.pf2e.feats-srd.lIg5Gzz7W70jfbk1',
        ],
    },
] as const

type UuidsType = [ItemUUID, Omit<Category, 'uuids'> & { index: number }]
const [UUIDS, EQUIP_UUID, FEATS_UUID, RULES_UUIDS, FLATTENED] = (() => {
    const UUIDS: UuidsType[] = []
    const FLATTENED = {} as Record<CategoryName, ItemUUID[]>
    const FEATS: ItemUUID[] = []
    const EQUIP: ItemUUID[] = []
    const RULES: ItemUUID[] = []

    for (const { type, category, label, uuids } of CATEGORIES) {
        FLATTENED[category] ??= []
        FLATTENED[category].push(...uuids)
        UUIDS.push(...uuids.map((uuid, index) => [uuid, { type, category, label, index }] as UuidsType))
        if (RULE_TYPES.includes(type as typeof RULE_TYPES[number])) RULES.push(...uuids)
        if (uuids[0].includes('equipment-srd')) EQUIP.push(uuids[0])
        else FEATS.push(uuids[0])
    }

    return [new Map(UUIDS), EQUIP, FEATS, RULES, FLATTENED]
})()

export function hasAnyCategory(actor: CharacterPF2e) {
    return (
        actor.itemTypes.feat.some(item => includesSourceId(item, FEATS_UUID)) ||
        actor.itemTypes.equipment.some(item => includesSourceId(item, EQUIP_UUID) && item.isInvested)
    )
}

export function getCategoryUUIDS(category: CategoryName) {
    return FLATTENED[category]
}

export function getRuleItems(actor: CharacterPF2e) {
    return filterItemsWithSourceId(actor, RULES_UUIDS, ['feat', 'equipment'])
}

export function isRuleItem(item: ItemPF2e) {
    return includesSourceId(item, RULES_UUIDS)
}

export function hasCategories(actor: CharacterPF2e) {
    const categories = {} as Record<CategoryName, Omit<ReturnedCategory, 'items'> & { items: (undefined | true)[] }>
    const items = [...actor.itemTypes.feat, ...actor.itemTypes.equipment]
    for (const item of items) {
        const sourceId = getSourceId<ItemUUID>(item)
        if (!sourceId || (item.isOfType('equipment') && !item.isInvested)) continue

        const entry = UUIDS.get(sourceId)
        if (!entry) continue

        const { category, index, type, label } = entry
        categories[category] ??= { category, type, label, items: [] }
        categories[category].items[index] = true
        if (!index && !label) categories[category].label = item.name
    }
    return Object.values(categories).filter(x => x.items[0]) as ReturnedCategory[]
}

export function isCategory<N extends CategoryType, C extends Category = ExtractedCategory<N>>(
    object: ReturnedCategory,
    category: N
): object is ReturnedCategory<C> {
    return object.type === category
}
