type FeatGroup = 'scroll' | 'trickster'
type FeatGroups = [FeatGroup, 0 | 1 | 2][]

interface ItemFlag {
    name: string
    uuid: ItemUUID
}

type ItemFlags = Record<FeatGroup, ItemFlag[]>
