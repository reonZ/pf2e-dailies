type DailyFunction<A extends BaseDailyValueArgs, V extends any> = (args: A) => V | Promise<V>
type DailyValue<A extends BaseDailyValueArgs, V extends any> = V | DailyFunction<A, V>

type DailyLabel<T extends DailyGenerics> = DailyValue<DailyValueArgs<T>, string>

type BaseDailyConditionFunction<T extends DailyGenerics = DailyGenerics> = DailyFunction<BaseDailyValueArgs<T>, boolean>
type DailyConditional<T extends DailyGenerics, A extends DailyValueArgs<T> = DailyValueArgs<T>> = {
    childPredicate?: RawPredicate
    condition?: DailyFunction<A, boolean>
}

type DailyChildName = string
type DailyRowName = string
type DailyGenerics = [DailyRowName, DailyCustom, DailyChildName]

type Daily<T extends DailyGenerics = DailyGenerics> = {
    key: string
    item: {
        uuid: ItemUUID
        condition?: BaseDailyConditionFunction<T>
    }
    label?: DailyLabel<T>
    children?: DailyChild<T>[]
    rows: DailyRow<T>[]
    prepare?: (args: DailyPrepareArgs<T>) => T[1] | Promise<T[1]>
    process: DailyProcessFunction<T>
    rest?: (args: DailyRestArgs) => void | Promise<void>
}

type DailyChild<T extends DailyGenerics> = {
    slug: T[2]
    uuid: ItemUUID
    condition?: BaseDailyConditionFunction<T>
}

type ReturnedDaily<T extends DailyGenerics = DailyGenerics> = Omit<Daily, 'item' | 'children'> & {
    item: ItemPF2e
    children?: (DailyChild<T> & {
        item?: ItemPF2e
    })[]
}

type DailyTemplate = { label: string; rows: DailyRowTemplate[] }

type DailyProcessFunction<T extends DailyGenerics = DailyGenerics> = DailyFunction<DailyProcessFunctionArgs<T>, void>

type BaseDailyFilter<V extends string = string> = {
    traits?:
        | (V | { value: V; not?: boolean })[]
        | {
              conjunction?: 'and' | 'or'
              selected?: (V | { value: V; not?: boolean })[]
          }
    source?: string[]
    rarity?: Rarity[]
}

type DailyFeatFilter = BaseDailyFilter<FeatTrait> & {
    feattype?: FeatType[]
    skills?: (keyof ConfigPF2e['PF2E']['skillList'])[]
    level?: DailySimplifiableValue | { min?: DailySimplifiableValue; max?: DailySimplifiableValue }
}

type DailySpellFilter = BaseDailyFilter<SpellTrait> & {
    category?: (keyof ConfigPF2e['PF2E']['spellCategories'] | 'cantrip')[]
    level?: DailySimplifiableValue | number[]
    school?: MagicSchool[]
    traditions?: MagicTradition[]
    // timefilter: SelectData
}

type SavedCustomDaily = { key: string; code: string }
