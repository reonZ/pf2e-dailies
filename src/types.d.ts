declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e

type CategoryType = typeof import('./categories').CATEGORY_TYPES[number]

type TrainedSkillName = typeof import('./categories').TRAINED_SKILL_NAMES[number]
type AddedLanguageName = typeof import('./categories').ADDED_LANGUAGE_NAMES[number]
type ScrollChainName = typeof import('./categories').SCROLL_CHAIN_NAMES[number]

type RuleName = typeof import('./categories').RULE_NAMES[number]

type CategoryName = TrainedSkillName | AddedLanguageName | ScrollChainName

type BaseCategory<T extends CategoryType, N extends CategoryName> = {
    type: T
    category: N
    uuids: [ItemUUID, ...ItemUUID[]]
    label?: string
    isItem?: boolean
}

type TrainedSkill = BaseCategory<'trainedSkill', TrainedSkillName>
type AddedLanguage = BaseCategory<'addedLanguage', AddedLanguageName>
type ScrollChain = BaseCategory<'scrollChain', ScrollChainName>

type Category = TrainedSkill | AddedLanguage | ScrollChain

type SavedTrainedSkill = SkillLongForm
type SavedAddedLanguage = Language
type SavedScrollChain = { name: string; uuid: ItemUUID | '' }[]

type SavedCategories = Partial<
    Record<TrainedSkillName, SavedTrainedSkill> &
        Record<AddedLanguageName, SavedAddedLanguage> &
        Record<ScrollChainName, SavedScrollChain>
>

type BaseCategoryTemplate<T extends CategoryType, N extends CategoryName> = {
    type: T
    category: N
    label: string
}

type TemplateStringValue<S extends string> = S | ''

type BaseGroupTemplate<T extends CategoryType, N extends CategoryName, R extends any> = BaseCategoryTemplate<T, N> & {
    rows: R[]
}

type TrainedSkillTemplate = BaseCategoryTemplate<'trainedSkill', TrainedSkillName> & {
    skills: { skill: SkillLongForm }[]
    selected: TemplateStringValue<SkillLongForm>
}

type AddedLanguageTemplate = BaseCategoryTemplate<'addedLanguage', AddedLanguageName> & {
    languages: { language: Language }[]
    selected: TemplateStringValue<Language>
}

type ScrollChainTemplateSlot = { spellLevel: number; name: string; uuid: TemplateStringValue<ItemUUID> }
type ScrollChainTemplate = BaseGroupTemplate<'scrollChain', ScrollChainName, ScrollChainTemplateSlot>

type RowTemplate = TrainedSkillTemplate | AddedLanguageTemplate
type GroupTemplate = ScrollChainTemplate

type ReturnedCategory<C extends Category = Category> = Omit<Required<C>, 'uuids' | 'isItem'> & {
    items: [true, ...(undefined | true)[]]
}

type SelectedObject = { uuid: string; selected: string; update: EmbeddedDocumentUpdateData<ItemPF2e> }

type BaseTemplateField<V extends string, T extends Category, D extends Record<string, any> = {}> = {
    value: V
    dataset: {
        type: T['type']
        category: T['category']
    } & D
}

type TrainedSkillField = BaseTemplateField<SkillLongForm, TrainedSkill>

type AddedLanguageField = BaseTemplateField<Language, AddedLanguage>

type ScrollChainField = BaseTemplateField<
    string,
    ScrollChain,
    {
        level: `${OneToTen}`
        uuid: TemplateStringValue<ItemUUID>
    }
>

type TemplateFields = TrainedSkillField | AddedLanguageField | ScrollChainField
