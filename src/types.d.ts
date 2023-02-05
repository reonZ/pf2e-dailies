declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e

type ScrollGroup = 'scroll' | 'trickster'
type SkillGroup = 'longevity' | 'ageless' | 'memories' | 'studies'
type FeatGroup = ScrollGroup | SkillGroup

interface ItemFlag {
    name: string
    uuid: ItemUUID
}

type SavedFlags = Record<ScrollGroup, ItemFlag[]> & Record<SkillGroup, SkillLongForm>
