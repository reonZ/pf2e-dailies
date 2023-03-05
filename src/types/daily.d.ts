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

type DailyFeatFilter = Omit<InitialFeatFilters, 'level'> & {
    level?: DailySimplifiableValue | { min?: DailySimplifiableValue; max?: DailySimplifiableValue }
}

type DailySpellFilter = Omit<InitialSpellFilters, 'level'> & {
    level?: DailySimplifiableValue | number[]
}

type SavedCustomDaily = { key: string; code: string }
