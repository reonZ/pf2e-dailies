import { getSourceId, includesSourceId } from '@utils/foundry/flags'
import { filterItemsWithSourceId, hasItemWithSourceId } from '@utils/foundry/item'

export const CATEGORY_TYPES = ['trainedSkill', 'addedLanguage', 'scrollChain'] as const

export const TRAINED_SKILL_NAMES = ['ageless', 'longevity', 'memories', 'studies'] as const
export const ADDED_LANGUAGE_NAMES = ['linguistics', 'borts'] as const
export const SCROLL_CHAIN_NAMES = ['esoterica', 'trickster'] as const

export const RULE_NAMES = [...TRAINED_SKILL_NAMES, ...ADDED_LANGUAGE_NAMES] as const

const CATEGORIES: Category[] = [
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
        isItem: true,
    },
    // ScrollChain
    {
        type: 'scrollChain',
        category: 'esoterica',
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
]

const [UUIDS, EQUIP_UUID, FEATS_UUID, RULES_UUIDS, FLATTENED] = (() => {
    const UUIDS: Map<ItemUUID, Omit<Category, 'uuids'> & { index: number; isItem: boolean }> = new Map()
    const FEATS: ItemUUID[] = []
    const EQUIP: ItemUUID[] = []
    const RULES: ItemUUID[] = []
    const FLATTENED = {} as Record<CategoryName, [ItemUUID, ...ItemUUID[]]>

    for (const { type, category, label, uuids, isItem = false } of CATEGORIES) {
        FLATTENED[category] ??= [] as unknown as [ItemUUID, ...ItemUUID[]]

        uuids.forEach((uuid, index) => {
            FLATTENED[category].push(uuid)
            UUIDS.set(uuid, { type, category, label, index, isItem })
        })

        if (RULE_NAMES.includes(category as RuleName)) RULES.push(...uuids)

        if (isItem) EQUIP.push(uuids[0])
        else FEATS.push(uuids[0])
    }

    return [UUIDS, EQUIP, FEATS, RULES, FLATTENED]
})()

export function getCategoryUUIDS(category: CategoryName) {
    return FLATTENED[category]
}

export function getRuleItems(actor: CharacterPF2e) {
    return filterItemsWithSourceId(actor, RULES_UUIDS, ['feat', 'equipment'])
}

export function hasAnyCategory(actor: CharacterPF2e) {
    return (
        hasItemWithSourceId(actor, FEATS_UUID, ['feat']) ||
        actor.itemTypes.equipment.some(item => includesSourceId(item, EQUIP_UUID) && item.isInvested)
    )
}

export function hasCategories(actor: CharacterPF2e) {
    const categories: Partial<
        Record<CategoryName, Omit<Required<Category>, 'uuids' | 'isItem'> & { items: (undefined | true)[] }>
    > = {}

    const items = [...actor.itemTypes.feat, ...actor.itemTypes.equipment]
    for (const item of items) {
        const sourceId = getSourceId<ItemUUID>(item)
        if (!sourceId || (item.isOfType('equipment') && !item.isInvested)) continue

        const entry = UUIDS.get(sourceId)
        if (!entry) continue

        const { category, index, type, label = '' } = entry

        categories[category] ??= { category, type, label, items: [] }
        categories[category]!.items[index] = true

        if (index === 0 && !label) categories[category]!.label = item.name
    }

    return Object.values(categories).filter(x => x.items[0]) as ReturnedCategory[]
}

export function isScrollChainRecord(record: ReturnedCategory): record is ReturnedCategory<ScrollChain> {
    return record.type === 'scrollChain'
}

export function isTrainedSkill(record: ReturnedCategory): record is ReturnedCategory<TrainedSkill> {
    return record.type === 'trainedSkill'
}

export function isAddedLanguage(record: ReturnedCategory): record is ReturnedCategory<AddedLanguage> {
    return record.type === 'addedLanguage'
}
