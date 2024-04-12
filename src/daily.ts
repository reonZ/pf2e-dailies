import type {
    Daily,
    DailyCustom,
    DailyItem,
    DailyRow,
    DailyRowDropFilter,
    DailyRowDropFilters,
    DailyRowDropType,
    DailyRowType,
    DailyRows,
} from "./types";

function createDaily<
    TItemSlug extends string = string,
    TCustom extends DailyCustom = {},
    TRowSlug extends string = string,
    TItems extends DailyItem<TItemSlug>[] = DailyItem<TItemSlug>[],
    TRows extends DailyRow<TRowSlug>[] = DailyRow<TRowSlug>[]
>(config: Daily<TItemSlug, TCustom, TRowSlug, TItems, TRows>): Daily {
    return config as unknown as Daily;
}

function filterIsOfType<T extends DailyRowDropType>(
    filter: DailyRowDropFilter,
    type: T
): filter is DailyRowDropFilters[T] {
    return filter.type === type;
}

function rowIsOfType<T extends DailyRowType>(row: DailyRow, ...types: T[]): row is DailyRows[T] {
    return types.some((type) => row.type === type);
}

export { createDaily, filterIsOfType, rowIsOfType };
