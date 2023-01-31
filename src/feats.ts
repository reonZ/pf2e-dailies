type FlattenedUUIDS = Map<ItemUUID, { uuid: ItemUUID; group: FeatGroup; index: number; exists: boolean }>

const UUIDS: Record<FeatGroup, ItemUUID[]> = {
    scroll: [
        'Compendium.pf2e.feats-srd.OqObuRB8oVSAEKFR',
        'Compendium.pf2e.feats-srd.nWd7m0yRcIEVUy7O',
        'Compendium.pf2e.feats-srd.LHjPTV5vP3MOsPPJ',
    ],
    talisman: ['Compendium.pf2e.feats-srd.ygCLN0brunmBYtJR', 'Compendium.pf2e.feats-srd.VO8HbMQ79NULE4FQ'],
    trickster: [
        'Compendium.pf2e.feats-srd.ROAUR1GhC19Pjk9C',
        'Compendium.pf2e.feats-srd.UrOj9TROtn8nuxPf',
        'Compendium.pf2e.feats-srd.lIg5Gzz7W70jfbk1',
    ],
    dabbler: ['Compendium.pf2e.feats-srd.1t5479E6bdvFs4E7', 'Compendium.pf2e.feats-srd.PTXZ2C3AV8tZf0iX'],
}

function flattenUUIDS(): FlattenedUUIDS {
    const uuids = Object.entries(UUIDS).flatMap(([group, uuids]) => {
        return uuids.map((x, i) => [x, { uuid: x, group: group as FeatGroup, index: i, exists: false }] as const)
    })
    return new Map(uuids)
}

function expandUUIDS(flatUUIDS: FlattenedUUIDS) {
    const uuids = {} as Record<FeatGroup, boolean[]>
    for (const entry of flatUUIDS.values()) {
        uuids[entry.group] ??= []
        uuids[entry.group][entry.index] = entry.exists
    }
    return uuids
}

export function hasAllFeats(actor: CharacterPF2e) {
    const uuids = flattenUUIDS()
    actor.itemTypes.feat.forEach(feat => {
        const sourceId = feat.getFlag('core', 'sourceId') as ItemUUID
        const entry = uuids.get(sourceId)
        if (entry) entry.exists = true
    })
    return expandUUIDS(uuids)
}

export function hasAnyFeat(actor: CharacterPF2e, feats: FeatGroups) {
    const uuids = feats.map(x => UUIDS[x[0]][x[1]])
    return !!actor.itemTypes.feat.find(x => uuids.includes(x.getFlag('core', 'sourceId') as ItemUUID))
}
