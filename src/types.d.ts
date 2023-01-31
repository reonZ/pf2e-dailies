type ScrollFeatGroup = 'scroll' | 'trickster'
type TalismanFeatGroup = 'dabbler' | 'talisman'
type FeatGroup = ScrollFeatGroup | TalismanFeatGroup
type FeatGroups = ([ScrollFeatGroup, 0 | 1 | 2] | [TalismanFeatGroup, 0 | 1])[]

interface ItemFlag {
    name: string
    uuid: ItemUUID
    itemId: string
}

type ItemFlags = Record<FeatGroup, ItemFlag[]>
