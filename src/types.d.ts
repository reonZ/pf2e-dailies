declare const game: GamePF2e
declare const canvas: CanvasPF2e
declare const ui: UiPF2e

/**
 *
 */

type FourElementTrait = Exclude<ElementalTrait, 'metal'>

type MindSmithDamageType = keyof typeof import('@data/weapon').WEAPON_GROUPS
type MindSmithWeaponTrait = typeof import('@data/weapon').WEAPON_TRAITS[number]
type MindSmithWeaponRunes = typeof import('@data/weapon').WEAPON_RUNES[number]
type MindSmithWeaponGreaterRunes = typeof import('@data/weapon').WEAPON_GREATER_RUNES[number]
type MindSmithWeaponAllRunes = MindSmithWeaponRunes | MindSmithWeaponGreaterRunes
type SavedMindSmith = {
    damage: MindSmithDamageType
    trait: MindSmithWeaponTrait
    rune: MindSmithWeaponAllRunes
}
type MindSmithRowTemplate<K extends keyof SavedMindSmith> = SelectRowTemplate<MindSmith, SavedMindSmith[K]> & {
    dataset: { subcategory: K }
}
type MindSmithTemplateField<K extends keyof SavedMindSmith = keyof SavedMindSmith> = SelectTemplateField<
    MindSmith,
    SavedMindSmith[K]
> & {
    dataset: { subcategory: K }
}

// categories
type TrainedSkill = ExtractedCategory<'trainedSkill'>
type ThaumaturgeTome = ExtractedCategory<'thaumaturgeTome'>
type TrainedLore = ExtractedCategory<'trainedLore'>
type AddedLanguage = ExtractedCategory<'addedLanguage'>
type AddedResistance = ExtractedCategory<'addedResistance'>
type ScrollChain = ExtractedCategory<'scrollChain'>
type CombatFlexibility = ExtractedCategory<'combatFlexibility'>
type ScrollSavant = ExtractedCategory<'scrollSavant'>
type TricksterAce = ExtractedCategory<'tricksterAce'>
type GanziHeritage = ExtractedCategory<'ganziHeritage'>
type FamiliarAbility = { type: 'familiarAbility'; category: 'familiar' }
type MindSmith = ExtractedCategory<'mindSmith'>
type AddedFeat = ExtractedCategory<'addedFeat'>
type UseRations = { type: 'useRations'; category: 'rations' }

// saves
type SavedCategories = Partial<
    SavedCategory<TrainedSkill, SavedSkill> &
        SavedCategory<ThaumaturgeTome, SavedSkill[]> &
        SavedCategory<TrainedLore, string> &
        SavedCategory<AddedLanguage, Language> &
        SavedCategory<AddedResistance, ResistanceType> &
        SavedCategory<ScrollChain, SavedDrop[]> &
        SavedCategory<CombatFlexibility, SavedDrop[]> &
        SavedCategory<ScrollSavant, SavedDrop[]> &
        SavedCategory<TricksterAce, SavedDrop> &
        SavedCategory<FamiliarAbility, string[]> &
        SavedCategory<MindSmith, Partial<SavedMindSmith>> &
        SavedCategory<AddedFeat, SavedDrop>
>

// templates
type TrainedSkillTemplate = ComboTemplate<TrainedSkill, TemplateSkill>
type ThaumaturgeTomeTemplate = BaseCategoryTemplate<
    ThaumaturgeTome,
    (ComboRowTemplate<ThaumaturgeTome, TemplateSkill> & { dataset: { rank: OneToFour } })[]
>
type TrainedLoreTemplate = InputTemplate<TrainedLore, string>
type AddedLanguageTemplate = SelectTemplate<AddedLanguage, Language>
type AddedResistanceTemplate = SelectTemplate<AddedResistance, ResistanceType>
type ScrollChainTemplate = DropTemplate<ScrollChain>
type CombatFlexibilityTemplate = DropTemplate<CombatFlexibility>
type ScrollSavantTemplate = DropTemplate<ScrollSavant>
type TricksterAceTemplate = DropTemplate<TricksterAce>
type GanziHeritageTemplate = RandomTemplate<GanziHeritage, ResistanceType>
type FamiliarAbilityTemplate = SelectTemplate<FamiliarAbility, string>
type MindSmithTemplate = BaseCategoryTemplate<
    MindSmith,
    [AlertRowTemplate<MindSmith>] | [MindSmithRowTemplate<'damage'>, MindSmithRowTemplate<'trait'>, MindSmithRowTemplate<'rune'>]
>
type AddedFeatTemplate = DropTemplate<AddedFeat>
type UseRationsTemplate = SelectTemplate<UseRations, boolean>

type ComboTemplateFields =
    | ComboTemplateField<TrainedSkill>
    | (ComboTemplateField<ThaumaturgeTome> & {
          dataset: { rank: `${OneToFour}` }
      })

type TemplateField =
    | ComboTemplateFields
    | InputTemplateField<TrainedLore, string>
    | SelectTemplateField<AddedLanguage, Language>
    | SelectTemplateField<AddedResistance, ResistanceType>
    | DropTemplateField<ScrollChain>
    | DropTemplateField<CombatFlexibility>
    | DropTemplateField<ScrollSavant>
    | DropTemplateField<TricksterAce>
    | RandomTemplateField<GanziHeritage>
    | SelectTemplateField<FamiliarAbility, string>
    | MindSmithTemplateField
    | DropTemplateField<AddedFeat>
    | SelectTemplateField<UseRations, `${boolean}`>

/**
 * End of Variables
 */

type TemplateSkill = SkillLongForm | string

type SavedSkill = { selected: TemplateSkill; input: boolean }
type SavedDrop = { uuid: ItemUUID | ''; name: string }

type RemoveUUIDS<T> = {
    [K in keyof T as Exclude<K, 'uuids'>]: T[K]
}

type RawCategory = typeof import('./categories').CATEGORY_DATA[number]
type Category = { type: CategoryType; category: CategoryName }
type CategoryType = RawCategory['type'] | 'familiarAbility' | 'useRations'
type CategoryName = RawCategory['category'] | 'familiar' | 'rations'

type RulesName = typeof import('./categories').RULE_TYPES[number]

type ExtractedCategory<S extends string> = Omit<Extract<RawCategory, { type: S }>, 'uuids'>

type SavedCategory<C extends Category, D extends any> = Record<C['category'], D>

type TemplateRows<T extends BaseCategoryTemplate> = T['rows']
type TemplateRow<T extends BaseCategoryTemplate> = TemplateRows<T>[number]

type BaseCategoryTemplate<C extends Category = Category, R extends BaseRowTemplate[] = BaseRowTemplate[]> = {
    type: C['type']
    category: C['category']
    label: string
    rows: R
}

type BaseRowTemplate<C extends Category = Category, T extends string = string> = {
    rowType: T
    label?: string
}

type InputRowTemplate<C extends Category, S extends string> = BaseRowTemplate<C, 'input'> & {
    value: S | ''
    placeholder?: string
}

type AlertRowTemplate<C extends Category> = BaseRowTemplate<C, 'alert'> & {
    value: string
}

type SelectOption<O extends string> = { value: O; label: string }

type SelectRowTemplate<C extends Category, O extends string> = BaseRowTemplate<C, 'select'> & {
    value: O | ''
    options: SelectOption<O>[]
}

type DropRowTemplate<C extends Category = Category> = BaseRowTemplate<C, 'drop'> & {
    value: string
    dataset: {
        uuid: ItemUUID | ''
        level: number
    }
}

type ComboRowTemplate<C extends Category = Category, O extends string = string> = BaseRowTemplate<C, 'combo'> & {
    selected: O | ''
    value: O | ''
    placeholder?: string
    options: SelectOption<O>[]
    dataset: {
        input: boolean
    }
}

type RandomRowTemplate<C extends Category, O extends string> = BaseRowTemplate<C, 'random'> & {
    options: SelectOption<O>[]
}

type SelectTemplate<C extends Category, O extends string> = BaseCategoryTemplate<C, SelectRowTemplate<C, O>[]>

type DropTemplate<C extends Categor> = BaseCategoryTemplate<C, DropRowTemplate<C>[]>

type InputTemplate<C extends Category, S extends string> = BaseCategoryTemplate<C, InputRowTemplate<C, S>[]>

type AlertTemplate<C extends Category> = BaseCategoryTemplate<C, AlertRowTemplate<C>[]>

type ComboTemplate<C extends Category, O extends string> = BaseCategoryTemplate<C, ComboRowTemplate<C, O>[]>

type RandomTemplate<C extends Category, O extends string> = BaseCategoryTemplate<C, RandomRowTemplate<C, O>[]>

/**
 *
 */

type BaseTemplateField<H extends HTMLElement, C extends Category, V extends string> = Omit<H, 'value' | 'dataset'> & {
    value: V
    dataset: {
        type: C['type']
        category: C['category']
    }
}

type AlertTemplateField<C extends Category = Category> = BaseTemplateField<HTMLInputElement, C, string>

type RandomTemplateField<C extends Category> = BaseTemplateField<HTMLInputElement, C, never>

type SelectTemplateField<C extends Category = Category, O extends string = string> = BaseTemplateField<HTMLSelectElement, C, O>

type InputTemplateField<C extends Category, S extends string> = BaseTemplateField<HTMLInputElement, C, S>

type DropTemplateField<C extends Category> = BaseTemplateField<HTMLInputElement, C, string> & {
    dataset: {
        uuid: ItemUUID
        level: `${number}`
    }
}

type ComboTemplateField<C extends Category = Category> = BaseTemplateField<HTMLInputElement, C, string> & {
    dataset: {
        input: `${boolean}`
    }
}

type SearchButton = Omit<HTMLElement, 'value' | 'dataset'> & {
    dataset: { type: CategoryType; category: CategoryName; level: TemplateLevel }
}

// type ReturnedCategoryItems = [ItemPF2e, ...(undefined | ItemPF2e)[]]
// type ReturnedCategory<C extends Category = Category> = Omit<Required<C>, 'uuids' | 'label'> & {
//     label: string
//     items: ReturnedCategoryItems
// }

// type SelectedObject = { uuid: string; selected: string; update: EmbeddedDocumentUpdateData<ItemPF2e> }
