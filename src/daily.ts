import {
    CharacterPF2e,
    FeatOrFeatureCategory,
    FeatPF2e,
    FeatSource,
    ItemPF2e,
    ItemSourcePF2e,
    MagicTradition,
    Rarity,
    RuleElementSource,
    SkillSlug,
    SpellPF2e,
} from "module-helpers";

function createDaily<
    TItemSlug extends string = string,
    TCustom extends DailyCustom = {},
    TRowSlug extends string = string,
    TItems extends DailyItem<TItemSlug>[] = DailyItem<TItemSlug>[],
    TRows extends DailyRow<TRowSlug>[] = DailyRow<TRowSlug>[]
>(config: Daily<TItemSlug, TCustom, TRowSlug, TItems, TRows>): Daily {
    return config as unknown as Daily;
}

type Daily<
    TItemSlug extends string = string,
    TCustom extends DailyCustom = DailyCustom,
    TRowSlug extends string = string,
    TItems extends DailyItem<TItemSlug>[] = DailyItem<TItemSlug>[],
    TRows extends DailyRow<TRowSlug>[] | ReadonlyArray<TRowSlug> = DailyRow<TRowSlug>[]
> = {
    key: string;
    prepare?: (actor: CharacterPF2e, items: ExtractItems<TItemSlug, TItems>) => Promisable<TCustom>;
    label?:
        | string
        | ((actor: CharacterPF2e, items: ExtractItems<TItemSlug, TItems>) => Promisable<string>);
    rows: (
        actor: CharacterPF2e,
        items: ExtractItems<TItemSlug, TItems>,
        custom: TCustom
    ) => Promisable<TRows>;
    process: (
        options: DailyProcessOptions<TItemSlug, TCustom, TRowSlug, TItems, TRows>
    ) => Promisable<void>;
    afterItemAdded?: (
        options: DailyAfterItemAddedOptions<TItemSlug, TCustom, TRowSlug, TItems, TRows>
    ) => Promisable<void>;
    rest?: (options: DailyRestOptions) => Promisable<void>;
    config?: (actor: CharacterPF2e) => Promisable<DailyConfigRow[] | undefined>;
} & RequireAtLeastOne<
    {
        condition?: (actor: CharacterPF2e) => Promisable<boolean>;
        items?: TItems;
    },
    "condition" | "items"
>;

type ExtractItems<
    TItemSlug extends string,
    TItems extends DailyItem<TItemSlug>[]
> = TItems[number] extends { slug: infer S extends TItemSlug }
    ? {
          [k in S]: Extract<TItems[number], { slug: k }> extends { required: true }
              ? ItemPF2e
              : ItemPF2e | undefined;
      }
    : never;

type ExtractRows<
    TRowSlug extends string,
    TRows extends DailyRow<TRowSlug>[] | ReadonlyArray<TRowSlug>
> = TRows[number] extends {
    slug: infer S extends TRowSlug;
}
    ? {
          [k in S]: Extract<TRows[number], { slug: k }> extends { type: "combo" }
              ? Extract<TRows[number], { slug: k }> extends { condition: boolean }
                  ? DailyRowComboData | undefined
                  : DailyRowComboData
              : Extract<TRows[number], { slug: k }> extends { type: "drop" }
              ? Extract<TRows[number], { slug: k }> extends { condition: boolean }
                  ? DailyRowDropData | undefined
                  : DailyRowDropData
              : Extract<TRows[number], { slug: k }> extends { type: "select" | "input" | "random" }
              ? Extract<TRows[number], { slug: k }> extends { condition: boolean }
                  ? string | undefined
                  : string
              : Extract<TRows[number], { slug: k }> extends { type: "notify" }
              ? Extract<TRows[number], { slug: k }> extends { condition: boolean }
                  ? true | undefined
                  : true
              : never;
      }
    : never;

type DailyAfterItemAddedOptions<
    TItemSlug extends string = string,
    TCustom extends DailyCustom = DailyCustom,
    TRowSlug extends string = string,
    TItems extends DailyItem<TItemSlug>[] = DailyItem<TItemSlug>[],
    TRows extends DailyRow<TRowSlug>[] | ReadonlyArray<TRowSlug> = DailyRow<TRowSlug>[],
    TRowMap = ExtractRows<TRowSlug, TRows>
> = Omit<
    DailyProcessOptions<TItemSlug, TCustom, TRowSlug, TItems, TRows, TRowMap>,
    "addItem" | "addFeat" | "addRule"
> & {
    addedItems: ItemPF2e<CharacterPF2e>[];
};

type DailyProcessOptions<
    TItemSlug extends string = string,
    TCustom extends DailyCustom = DailyCustom,
    TRowSlug extends string = string,
    TItems extends DailyItem<TItemSlug>[] = DailyItem<TItemSlug>[],
    TRows extends DailyRow<TRowSlug>[] | ReadonlyArray<TRowSlug> = DailyRow<TRowSlug>[],
    TRowMap = ExtractRows<TRowSlug, TRows>
> = {
    actor: CharacterPF2e;
    items: ExtractItems<TItemSlug, TItems>;
    rows: TRowMap;
    custom: TCustom;
    messages: {
        add: ((group: DailyMessageGroupType, message: DailyMessageOptions) => void) &
            ((group: string, message: DailyMessageOptions) => void);
        addGroup: (name: string, label?: string, order?: number) => void;
        addRaw: (message: string, order?: number) => void;
    };
    addItem: (source: PreCreate<ItemSourcePF2e> | ItemSourcePF2e, temporary?: boolean) => void;
    addFeat: (
        source: PreCreate<FeatSource> | FeatSource,
        parent?: ItemPF2e,
        temporary?: boolean
    ) => void;
    addRule: (item: ItemPF2e, source: DailyRuleElement) => void;
    replaceFeat: (original: FeatPF2e, source: PreCreate<FeatSource> | FeatSource) => void;
    updateItem: (data: EmbeddedDocumentUpdateData) => void;
    removeRule: (item: ItemPF2e, signature: (rule: DailyRuleElement) => boolean) => void;
    deleteItem: (item: ItemPF2e, temporary?: boolean) => void;
    setExtraFlags: (data: Record<string, any>) => void;
};

function rowIsOfType<T extends DailyRowType>(row: DailyRow, ...types: T[]): row is DailyRows[T] {
    return types.some((type) => row.type === type);
}

type DailyRestOptions = {
    actor: CharacterPF2e;
    updateItem: (data: EmbeddedDocumentUpdateData) => void;
    removeItem: (id: string) => void;
};

type DailyMessageGroupType =
    | "languages"
    | "skills"
    | "resistances"
    | "feats"
    | "spells"
    | "scrolls";

type DailyMessageOptions =
    | { uuid: string | ItemPF2e; label?: string; selected?: string; random?: boolean }
    | { sourceId: string; label?: string; selected?: string; random?: boolean }
    | { label: string; selected?: string; random?: boolean };

type DailyRuleElement = RuleElementSource & { [k: string]: any };

type DailyRowType = "select" | "combo" | "random" | "alert" | "input" | "notify" | "drop";

type DailyRow<TRowSlug extends string = string> = DailyRows<TRowSlug>[DailyRowType];

type DailyRows<TRowSlug extends string = string> = {
    select: DailyRowSelect<TRowSlug>;
    combo: DailyRowCombo<TRowSlug>;
    random: DailyRowRandom<TRowSlug>;
    alert: DailyRowAlert<TRowSlug>;
    input: DailyRowInput<TRowSlug>;
    notify: DailyRowNotify<TRowSlug>;
    drop: DailyRowDrop<TRowSlug>;
};

type DailyCustom = Record<string, unknown>;

type DailyItem<TItemSlug extends string = string> = {
    slug: TItemSlug;
    uuid: string;
    required?: boolean;
    condition?: (actor: CharacterPF2e, item: ItemPF2e) => Promisable<boolean>;
};

interface DailyRowBase<TRowSlug extends string, TType extends DailyRowType> {
    type: TType;
    slug: TRowSlug;
    label?: string;
    save?: boolean;
    empty?: boolean;
    order?: number;
    condition?: boolean;
}

type DailyRowSelectOptionGroup = { group: string };

type DailyRowSelectOptionValue = {
    value: string;
    label: string;
    unique?: string;
    skipUnique?: boolean;
};

type DailyRowSelectOption = DailyRowSelectOptionGroup | DailyRowSelectOptionValue;

type DailyRowSelect<TRowSlug extends string = string> = DailyRowBase<TRowSlug, "select"> & {
    options: DailyRowSelectOption[];
    unique?: string;
};

type DailyRowComboData = {
    selected: string;
    input: boolean;
};

type DailyRowCombo<TRowSlug extends string = string> = DailyRowBase<TRowSlug, "combo"> & {
    options: DailyRowSelectOption[];
    unique?: string;
};

type DailyRowRandom<TRowSlug extends string> = DailyRowBase<TRowSlug, "random"> & {
    options: DailyRowSelectOptionValue[];
};

type DailyRowAlert<TRowSlug extends string = string> = DailyRowBase<TRowSlug, "alert"> & {
    message: string;
    resolve: () => Promisable<boolean>;
};

type DailyRowInput<TRowSlug extends string> = DailyRowBase<TRowSlug, "input">;

type DailyRowNotify<TRowSlug extends string> = DailyRowBase<TRowSlug, "notify"> & {
    message: string;
    color?: boolean | string;
};

type DailyRowDropData = {
    uuid: string;
    name: string;
};

interface DailyRowDropBase<
    TRowSlug extends string,
    TType extends DailyRowDropType,
    TSearch extends DailyRowDropSearch
> extends DailyRowBase<TRowSlug, "drop"> {
    note?: string;
    onDrop?: (
        item: TType extends "feat" ? FeatPF2e : SpellPF2e,
        actor: CharacterPF2e
    ) => Promisable<boolean | string>;
    filter: {
        type: TType;
        search: TSearch;
    };
}

type DailyRowDropFeat<TRowSlug extends string = string> = DailyRowDropBase<
    TRowSlug,
    "feat",
    DailyRowDropFeatSearch
>;

type DailyRowDropSpell<TRowSlug extends string = string> = DailyRowDropBase<
    TRowSlug,
    "spell",
    DailyRowSpellSearch
>;

type DailyRowDrops<TRowSlug extends string> = {
    feat: DailyRowDropFeat<TRowSlug>;
    spell: DailyRowDropSpell<TRowSlug>;
};

type DailyRowDrop<TRowSlug extends string = string> = DailyRowDrops<TRowSlug>[DailyRowDropType];

interface DailyRowDropSearchBase<TCategory extends string> {
    category?: TCategory[];
    rarity?: Rarity[];
    source?: string[];
    traits?:
        | (string | { value: string; not?: boolean })[]
        | { selected: (string | { value: string; not?: boolean })[]; conjunction?: "or" | "and" };
}

type DailyRowDropFeatSearch = DailyRowDropSearchBase<FeatOrFeatureCategory> & {
    level?: number | { min?: number; max?: number } | "level" | "half";
    skills?: SkillSlug[];
};

type DailyRowSpellSearch = DailyRowDropSearchBase<SpellCategory> & {
    rank?: `${number}`[] | "level" | "half" | `${number}` | number | number[];
    traditions?: MagicTradition[];
};

type DailyRowDropSearch = DailyRowDropFeatSearch | DailyRowSpellSearch;

type DailyRowDropType = "feat" | "spell";

type SpellCategory = "cantrip" | "focus" | "ritual" | "spell";

type DailyConfigRow = DailyConfigRowRange | DailyConfigCheckbox;

type DailyConfigRowType = "range" | "checkbox";

type DailyConfigRowValue = boolean | number;

type DailyConfigRowBase<TInput extends DailyConfigRowType, TValue extends DailyConfigRowValue> = {
    type: TInput;
    name: string;
    value?: TValue;
    label?: string;
    dispatchUpdateEvent?: boolean;
};

type DailyConfigCheckbox = DailyConfigRowBase<"checkbox", boolean>;

type DailyConfigRowRange = DailyConfigRowBase<"range", number> & {
    min?: number;
    max?: number;
    step?: number;
    saveMaxValue?: boolean;
};

type DailyRowData = DailyRowComboData | DailyRowDropData | string | true;

export { createDaily, rowIsOfType };
export type {
    Daily,
    DailyConfigCheckbox,
    DailyConfigRow,
    DailyConfigRowValue,
    DailyCustom,
    DailyItem,
    DailyMessageOptions,
    DailyProcessOptions,
    DailyRow,
    DailyRowAlert,
    DailyRowComboData,
    DailyRowData,
    DailyRowDrop,
    DailyRowDropData,
    DailyRowDropFeat,
    DailyRowDropSpell,
    DailyRowDropType,
    DailyRowSelect,
    DailyRowSelectOption,
    DailyRowSelectOptionValue,
    DailyRowType,
    DailyRuleElement,
};
