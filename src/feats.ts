type FlattenedUUIDS = Record<ItemUUID, { group: FeatGroup; index: number }>

export const SKILL_CATEGORIES: SkillGroup[] = ['longevity', 'ageless', 'memories', 'studies']

const CATEGORIES: Record<FeatGroup, ItemUUID[]> = {
    scroll: [
        'Compendium.pf2e.feats-srd.OqObuRB8oVSAEKFR',
        'Compendium.pf2e.feats-srd.nWd7m0yRcIEVUy7O',
        'Compendium.pf2e.feats-srd.LHjPTV5vP3MOsPPJ',
    ],
    trickster: [
        'Compendium.pf2e.feats-srd.ROAUR1GhC19Pjk9C',
        'Compendium.pf2e.feats-srd.UrOj9TROtn8nuxPf',
        'Compendium.pf2e.feats-srd.lIg5Gzz7W70jfbk1',
    ],
    longevity: ['Compendium.pf2e.feats-srd.WoLh16gyDp8y9WOZ'],
    ageless: ['Compendium.pf2e.feats-srd.wylnETwIz32Au46y'],
    memories: ['Compendium.pf2e.feats-srd.ptEOt3lqjxUnAW62'],
    studies: ['Compendium.pf2e.feats-srd.9bgl6qYWKHzqWZj0'],
}

const flattenedUUIDS = (() => {
    const uuids: FlattenedUUIDS = {}
    for (const [group, entries] of Object.entries(CATEGORIES)) {
        for (let i = 0; i < entries.length; i++) {
            const uuid = entries[i]
            uuids[uuid] = { group: group as FeatGroup, index: i }
        }
    }
    return uuids
})()

const UUIDS = Object.keys(flattenedUUIDS) as ItemUUID[]

export function hasAllFeats(actor: CharacterPF2e) {
    const uuids = {} as Record<FeatGroup, boolean[]>
    for (const feat of actor.itemTypes.feat) {
        const sourceId = feat.getFlag('core', 'sourceId') as ItemUUID
        const entry = flattenedUUIDS[sourceId]
        if (!entry) continue
        uuids[entry.group] ??= []
        uuids[entry.group][entry.index] = true
    }
    return uuids
}

export function getFeat(actor: CharacterPF2e, feat: FeatGroup, index = 0) {
    const uuid = CATEGORIES[feat][index]
    return actor.itemTypes.feat.find(x => x.getFlag('core', 'sourceId') === uuid)
}

export function hasAnyFeat(actor: CharacterPF2e) {
    return !!actor.itemTypes.feat.find(x => UUIDS.includes(x.getFlag('core', 'sourceId') as ItemUUID))
}
