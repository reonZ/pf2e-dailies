declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e

/**
 * Variables
 */

type TrainedSkill = ExtractedCategory<'trainedSkill'>
type ThaumaturgeTome = ExtractedCategory<'thaumaturgeTome'>
type TrainedLore = ExtractedCategory<'trainedLore'>
type AddedLanguage = ExtractedCategory<'addedLanguage'>
type AddedResistance = ExtractedCategory<'addedResistance'>
type ScrollChain = ExtractedCategory<'scrollChain'>
type CombatFlexibility = ExtractedCategory<'combatFlexibility'>
type ScrollSavant = ExtractedCategory<'scrollSavant'>

type SavedCategories = Partial<
    BaseSavedCategory<TrainedSkill, SkillLongForm> &
        BaseSavedCategory<ThaumaturgeTome, SkillLongForm[]> &
        BaseSavedCategory<TrainedLore, string> &
        BaseSavedCategory<AddedLanguage, Language> &
        BaseSavedCategory<AddedResistance, ResistanceType> &
        SavedItemsCategory<ScrollChain> &
        SavedItemsCategory<CombatFlexibility> &
        SavedItemsCategory<ScrollSavant>
>

type ThaumaturgeTomeTemplateItem = SelectTemplate<SkillLongForm> & { rank: OneToFour; label: string }

type TrainedSkillTemplate = BaseCategoryTemplate<TrainedSkill, SelectTemplate<SkillLongForm>>
type ThaumaturgeTomeTemplate = BaseCategoryTemplate<ThaumaturgeTome, SelectTemplate<SkillLongForm>>
type TrainedLoreTemplate = BaseCategoryTemplate<TrainedLore, InputTemplate>
type AddedLanguageTemplate = BaseCategoryTemplate<AddedLanguage, SelectTemplate<Language>>
type AddedResistanceTemplate = BaseCategoryTemplate<AddedResistance, SelectTemplate<ResistanceType>>
type ScrollChainTemplate = BaseDropCategoryTemplate<ScrollChain>
type CombatFlexibilityTemplate = BaseDropCategoryTemplate<CombatFlexibility>
type ScrollSavantTemplate = BaseDropCategoryTemplate<ScrollSavant>

type TemplateField =
    | BaseTemplateField<TrainedSkill, SkillLongForm>
    | ExtraTemplateField<ThaumaturgeTome, SkillLongForm, { rank: `${OneToFour}`; label: string }>
    | BaseTemplateField<TrainedLore, string>
    | BaseTemplateField<AddedLanguage, Language>
    | BaseTemplateField<AddedResistance, ResistanceType>
    | DropTemplateField<ScrollChain>
    | DropTemplateField<CombatFlexibility>
    | DropTemplateField<ScrollSavant>

/**
 * End of Variables
 */

type SavedItem = { name: string; uuid: TemplateUUID }
type TemplateUUID = ItemUUID | ''
type TemplateLevel = `${OneToTen}`

type FourElementTrait = Exclude<ElementalTrait, 'metal'>

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
    options: readonly K[]
    selected: K | ''
}

type InputTemplate = {
    type: 'input'
    selected: string
    placeholder: string
}

type DropTemplate = {
    type: 'drop'
    label: string
    level: number
    name: string
    uuid: TemplateUUID
}

type BaseTemplateField<C extends Category, V extends string> = Omit<HTMLElement, 'value' | 'dataset'> & {
    value: V
    dataset: {
        type: C['type']
        category: C['category']
    }
}

type ExtraTemplateField<C extends Category, V extends string, E extends Record<string, any>> = BaseTemplateField<C, V> & {
    dataset: E
}

type DropTemplateField<C extends Category> = BaseTemplateField<C, string> & {
    dataset: {
        level: TemplateLevel
        uuid: ItemUUID
    }
}

type SearchTemplateButton = Omit<HTMLElement, 'dataset'> & { dataset: { type: CategoryType; level: TemplateLevel } }

type ReturnedCategoryItems = [ItemPF2e, ...(undefined | ItemPF2e)[]]
type ReturnedCategory<C extends Category = Category> = Omit<Required<C>, 'uuids' | 'label'> & {
    label: string
    items: ReturnedCategoryItems
}

type SelectedObject = { uuid: string; selected: string; update: EmbeddedDocumentUpdateData<ItemPF2e> }
