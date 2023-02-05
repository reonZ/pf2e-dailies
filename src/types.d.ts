declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e

type ScrollCategory = typeof import('./items').SCROLL_CATEGORIES[number]
type SkillCategory = typeof import('./items').SKILL_CATEGORIES[number]
type LanguageCategory = typeof import('./items').LANGUAGE_CATEGORIES[number]
type RuleCategory = SkillCategory | LanguageCategory
type Category = ScrollCategory | SkillCategory | LanguageCategory

interface ItemFlag {
    name: string
    uuid: ItemUUID
}

type SavedFlags = Record<ScrollCategory, ItemFlag[]> & Record<RuleCategory, string>

type TemplateSkill = { category: SkillCategory; name: string; selected: string }

type TemplateLanguage = { category: LanguageCategory; name: string; selected: string }

type TemplateScrollSlot = { spellLevel: number; name: string; uuid: ItemUUID | '' }
type TemplateScroll = { category: ScrollCategory; name: string; slots: TemplateScrollSlot[] }

type ChoiceObject = { uuid: string; choice: string; update: EmbeddedDocumentUpdateData<ItemPF2e> }
