declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e

type ScrollGroup = 'scroll' | 'trickster'
type FeatGroup = ScrollGroup | 'longevity'

interface ItemFlag {
    name: string
    uuid: ItemUUID
}

type SavedFlags = {
    scroll: ItemFlag[]
    trickster: ItemFlag[]
    longevity: SkillLongForm
}
