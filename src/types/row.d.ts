type DailyRowType = 'combo' | 'select' | 'input' | 'random' | 'alert' | 'drop'

type DailyRowDropFunctionReturnedValue = boolean | { error: string; data?: Record<string, string | number | boolean> }
type DailyRowDropFunction<T extends DailyGenerics = DailyGenerics, I extends ItemPF2e = ItemPF2e> = (
    item: I,
    args: DailyValueArgs<T>
) => DailyRowDropFunctionReturnedValue | Promise<DailyRowDropFunctionReturnedValue>

type DailyRow<T extends DailyGenerics = DailyGenerics> =
    | DailyRowInput<T>
    | DailyRowSelect<T>
    | DailyRowRandom<T>
    | DailyRowCombo<T>
    | DailyRowDrop<T>
    | DailyRowAlert<T>

type BaseDailyRow<T extends DailyGenerics = DailyGenerics, R extends DailyRowType = DailyRowType> = DailyConditional<T> & {
    type: R
    slug: T[0]
    label?: DailyLabel<T>
    save?: boolean
}

type DailyRowAlert<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'alert'> & {
    message: DailyValue<DailyValueArgs<T>, string>
    fix: (args: DailyValueArgs<T>) => boolean | Promise<boolean>
}

type DailyRowInput<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'input'> & {
    placeholder?: string
}

type DailyOptions = (string | { value: string; label: string })[]

type DailyRowSelect<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'select'> & {
    options: DailyValue<DailyValueArgs<T>, DailyOptions>
    labelizer?: (args: DailyValueArgs<T>) => (value: string) => string
}

type DailyRowRandom<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'random'> & {
    options: DailyValue<DailyValueArgs<T>, DailyOptions>
    labelizer?: (args: DailyValueArgs<T>) => (value: string) => string
}

type DailyRowCombo<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'combo'> & {
    placeholder?: string
    options: DailyValue<DailyValueArgs<T>, DailyOptions>
    labelizer?: (args: DailyValueArgs<T>) => (value: string) => string
}

type BaseDailyRowDropFilter<
    T extends DailyGenerics = DailyGenerics,
    S extends string = string,
    F extends BaseDailyFilter = BaseDailyFilter,
    I extends ItemPF2e = ItemPF2e
> = {
    type: S
    search: DailyValue<DailyValueArgs<T>, F>
    drop?: DailyRowDropFunction<T, I>
}

type BaseDailyRowDrop<
    T extends DailyGenerics = DailyGenerics,
    S extends string = string,
    F extends BaseDailyFilter = BaseDailyFilter,
    I extends ItemPF2e = ItemPF2e
> = BaseDailyRow<T, 'drop'> & {
    filter: BaseDailyRowDropFilter<T, S, F, I>
}

type DailyRowDropFeat<T extends DailyGenerics = DailyGenerics> = BaseDailyRowDrop<T, 'feat', DailyFeatFilter, FeatPF2e>
type DailyRowDropSpell<T extends DailyGenerics = DailyGenerics> = BaseDailyRowDrop<T, 'spell', DailySpellFilter, SpellPF2e>
type DailyRowDrop<T extends DailyGenerics = DailyGenerics> = DailyRowDropFeat<T> | DailyRowDropSpell<T>

type DailyDropFeatFilter<T extends DailyGenerics = DailyGenerics> = DailyRowDropFeat<T>['filter']
type DailyDropSpellFilter<T extends DailyGenerics = DailyGenerics> = DailyRowDropSpell<T>['filter']

type DailyDropFeatParsedtFilter<T extends DailyGenerics = DailyGenerics> = Omit<DailyDropFeatFilter<T>, 'shared'> & {
    search: FeatFilters
}
type DailyDropSpellParsedtFilter<T extends DailyGenerics = DailyGenerics> = Omit<DailyDropSpellFilter<T>, 'shared'> & {
    search: SpellFilters
}
type DailyDropParsedFilter<T extends DailyGenerics = DailyGenerics> =
    | DailyDropFeatParsedtFilter<T>
    | DailyDropSpellParsedtFilter<T>

type DailyDropFeatResultFilter<T extends DailyGenerics = DailyGenerics> = Omit<DailyDropFeatFilter<T>, 'shared'> & {
    search: DailyFeatFilter
}
type DailyDropSpellResultFilter<T extends DailyGenerics = DailyGenerics> = Omit<DailyDropSpellFilter<T>, 'shared'> & {
    search: DailySpellFilter
}
type DailyDropResultFilter<T extends DailyGenerics = DailyGenerics> = DailyDropFeatResultFilter<T> | DailyDropSpellResultFilter<T>

type DailyRowTemplate<T extends DailyGenerics = DailyGenerics> = {
    label: string
    value: string
    order: number
    selected?: string
    placeholder?: string
    options?: SelectOption[]
    data: {
        type: DailyRowType
        daily: string
        row: T[0]
        input?: boolean
        uuid?: ItemUUID | ''
    }
}

type DailyRowFields<T extends DailyGenerics = DailyGenerics> = Record<T[0], DailyRowField<T>>

type DailyRowField<T extends DailyGenerics = DailyGenerics> = Omit<DailyRowTemplate<T>['data'], 'input' | 'uuid'> & {
    value: string
    input?: `${boolean}`
    uuid?: ItemUUID
}
