declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e

/**
 * Variables
 */

type TrainedSkill = ExtractedCategory<'trainedSkill'>
type AddedLanguage = ExtractedCategory<'addedLanguage'>
type ScrollChain = ExtractedCategory<'scrollChain'>
type CombatFlexibility = ExtractedCategory<'combatFlexibility'>
type ScrollSavant = ExtractedCategory<'scrollSavant'>

type SavedCategories = Partial<
    BaseSavedCategory<TrainedSkill, SkillLongForm> &
        BaseSavedCategory<AddedLanguage, Language> &
        SavedItemsCategory<ScrollChain> &
        SavedItemsCategory<CombatFlexibility> &
        SavedItemsCategory<ScrollSavant>
>

type TrainedSkillTemplate = BaseCategoryTemplate<TrainedSkill, SelectTemplate<SkillLongForm>>
type AddedLanguageTemplate = BaseCategoryTemplate<AddedLanguage, SelectTemplate<Language>>
type ScrollChainTemplate = BaseDropCategoryTemplate<ScrollChain>
type CombatFlexibilityTemplate = BaseDropCategoryTemplate<CombatFlexibility>
type ScrollSavantTemplate = BaseDropCategoryTemplate<ScrollSavant>

type DropTemplateField =
    | BaseDropTemplateField<ScrollChain>
    | BaseDropTemplateField<CombatFlexibility>
    | BaseDropTemplateField<ScrollSavant>

type TemplateField =
    | BaseTemplateField<TrainedSkill, SkillLongForm, {}>
    | BaseTemplateField<AddedLanguage, Language, {}>
    | DropTemplateField

/**
 * End of Variables
 */

type SavedItem = { name: string; uuid: TemplateUUID }
type TemplateUUID = ItemUUID | ''
type TemplateLevel = `${OneToTen}`

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }

type Category = typeof import('./categories').CATEGORIES[number]
type CategoryType = Category['type']
type CategoryName = Category['category']

type RulesName = typeof import('./categories').RULE_TYPES[number]

type ExtractedCategory<T extends string> = Extract<Category, { type: T }>

type BaseSavedCategory<C extends Category, D extends any> = Record<C['category'], D>

type SavedItemsCategory<C extends Category> = BaseSavedCategory<C, SavedItem[]>

type BaseCategoryTemplate<C extends Category = Category, R extends any = any> = {
    type: C['type']
    category: C['category']
    label: string
    rows: R[]
}

type BaseDropCategoryTemplate<C extends Category> = BaseCategoryTemplate<C, DropTemplate>

type SelectTemplate<K extends string> = {
    type: 'select'
    options: { key: K }[]
    selected: K | ''
}

type DropTemplate = {
    type: 'drop'
    label: string
    level: number
    name: string
    uuid: TemplateUUID
}

type BaseTemplateField<C extends Category, V extends string, D extends Record<string, string>> = Omit<
    HTMLElement,
    'value' | 'dataset'
> & {
    value: V
    dataset: {
        type: C['type']
        category: C['category']
    } & D
}

type BaseDropTemplateField<C extends Category> = BaseTemplateField<C, string, { level: TemplateLevel; uuid: ItemUUID }>

type SearchTemplateButton = Omit<HTMLElement, 'dataset'> & { dataset: { type: CategoryType; level: TemplateLevel } }

type ReturnedCategoryItems = [true, ...(undefined | true)[]]
type ReturnedCategory<C extends Category = Category> = Omit<Required<C>, 'uuids' | 'label'> & {
    label: string
    items: ReturnedCategoryItems
}

type SelectedObject = { uuid: string; selected: string; update: EmbeddedDocumentUpdateData<ItemPF2e> }
