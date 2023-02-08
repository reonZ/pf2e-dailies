export const SCROLL_CATEGORIES = ['esoterica', 'trickster'] as const
export const SKILL_CATEGORIES = ['longevity', 'ageless', 'memories', 'studies'] as const
export const LANGUAGE_CATEGORIES = ['linguistics', 'borts'] as const
export const RULE_CATEGORIES = [...SKILL_CATEGORIES, ...LANGUAGE_CATEGORIES] as const

// const CATEGORIES: Record<Category, ItemUUID[]> = {
//     esoterica: [
//         'Compendium.pf2e.feats-srd.OqObuRB8oVSAEKFR',
//         'Compendium.pf2e.feats-srd.nWd7m0yRcIEVUy7O',
//         'Compendium.pf2e.feats-srd.LHjPTV5vP3MOsPPJ',
//     ],
//     trickster: [
//         'Compendium.pf2e.feats-srd.ROAUR1GhC19Pjk9C',
//         'Compendium.pf2e.feats-srd.UrOj9TROtn8nuxPf',
//         'Compendium.pf2e.feats-srd.lIg5Gzz7W70jfbk1',
//     ],
//     longevity: ['Compendium.pf2e.feats-srd.WoLh16gyDp8y9WOZ'],
//     ageless: ['Compendium.pf2e.feats-srd.wylnETwIz32Au46y'],
//     memories: ['Compendium.pf2e.feats-srd.ptEOt3lqjxUnAW62'],
//     studies: ['Compendium.pf2e.feats-srd.9bgl6qYWKHzqWZj0'],
//     linguistics: ['Compendium.pf2e.feats-srd.eCWQU16hRLfN1KaX'],
//     borts: ['Compendium.pf2e.equipment-srd.iS7hAQMAaThHYE8g'],
// }

// export const flattenedUUIDS = (() => {
//     const uuids: Map<ItemUUID, { category: Category; index: number }> = new Map()
//     for (const [category, entries] of Object.entries(CATEGORIES)) {
//         for (let i = 0; i < entries.length; i++) {
//             const uuid = entries[i]
//             uuids.set(uuid, { category: category as Category, index: i })
//         }
//     }
//     return uuids
// })()

// const UUIDS = Array.from(flattenedUUIDS.keys())
// const RULE_UUIDS = RULE_CATEGORIES.map(category => CATEGORIES[category][0])

// export function getAllCategories(actor: CharacterPF2e) {
//     const items = {} as Record<Category, (ItemPF2e | undefined)[]>
//     for (const item of actor.items) {
//         const sourceId = item.getFlag('core', 'sourceId') as ItemUUID
//         const entry = flattenedUUIDS.get(sourceId)
//         if (entry) {
//             items[entry.category] ??= []
//             items[entry.category][entry.index] = item
//         }
//     }
//     return items
// }

// export function getItem(actor: CharacterPF2e, category: Category, index = 0) {
//     const uuid = CATEGORIES[category][index]
//     if (!uuid) return
//     return actor.items.find(x => x.getFlag('core', 'sourceId') === uuid)
// }

// export function getRuleItems(actor: CharacterPF2e): ItemPF2e[] {
//     return actor.items
//         .filter(x => RULE_UUIDS.includes(x.getFlag('core', 'sourceId') as ItemUUID))
//         .filter(x => !x.isOfType('equipment') || x.isInvested)
// }

// export function hasAnyItem(actor: CharacterPF2e) {
//     return !!actor.items.find(x => UUIDS.includes(x.getFlag('core', 'sourceId') as ItemUUID))
// }

// export function isSkillCategory(category: string): category is SkillCategory {
//     return SKILL_CATEGORIES.includes(category as SkillCategory)
// }

// export function isLanguageCategory(category: string): category is LanguageCategory {
//     return LANGUAGE_CATEGORIES.includes(category as LanguageCategory)
// }

// export function isScrollCategory(category: string): category is ScrollCategory {
//     return SCROLL_CATEGORIES.includes(category as ScrollCategory)
// }
