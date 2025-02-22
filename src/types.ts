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
    SpellcastingSheetDataWithCharges,
    SpellPF2e,
} from "module-helpers";

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

type DailyRowComboData = {
    selected: string;
    input: boolean;
};

type DailyRowDropData = {
    uuid: string;
    name: string;
};

type DailyRowData = DailyRowComboData | DailyRowDropData | string | true;

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

type DailyRestOptions = {
    actor: CharacterPF2e;
    updateItem: (data: EmbeddedDocumentUpdateData) => void;
    removeItem: (id: string) => void;
};

type DailyActorFlags = {
    rested?: boolean;
    addedItems?: string[];
    config?: Record<string, DailyConfigRowValue>;
    extra?: Record<string, any>;
    disabled?: Record<string, Record<string, DailyRowData>>;
    dailies?: Record<string, Record<string, DailyRowData>>;
    custom?: Record<string, Record<string, DailyRowData>>;
    tooltip?: string;
    temporaryDeleted?: Record<string, ItemSourcePF2e>;
};

type DailyOptionsItems<TItemSlug extends string = string> = Record<TItemSlug, ItemPF2e | undefined>;

type DailyRuleElement = RuleElementSource & { [k: string]: any };

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

type DailyMessageGroupType =
    | "languages"
    | "skills"
    | "resistances"
    | "feats"
    | "spells"
    | "scrolls";

type DailyMessageOptions =
    | { uuid: string | ItemPF2e; label?: string; selected?: string; random?: boolean }
    | { label: string; selected?: string; random?: boolean };

type DailyMessageGroup = {
    order: number;
    label?: string;
    messages: DailyMessageOptions[];
};

type DailyItem<TItemSlug extends string = string> = {
    slug: TItemSlug;
    uuid: string;
    required?: boolean;
    condition?: (actor: CharacterPF2e, item: ItemPF2e) => Promisable<boolean>;
};

type DailyCustom = Record<string, unknown>;

type DailyRowSelectOptionGroup = { group: string };

type DailyRowSelectOptionValue = {
    value: string;
    label: string;
    unique?: string;
    skipUnique?: boolean;
};

type DailyRowSelectOption = DailyRowSelectOptionGroup | DailyRowSelectOptionValue;

type DailyRowType = "select" | "combo" | "random" | "alert" | "input" | "notify" | "drop";

type DailyRows<TRowSlug extends string = string> = {
    select: DailyRowSelect<TRowSlug>;
    combo: DailyRowCombo<TRowSlug>;
    random: DailyRowRandom<TRowSlug>;
    alert: DailyRowAlert<TRowSlug>;
    input: DailyRowInput<TRowSlug>;
    notify: DailyRowNotify<TRowSlug>;
    drop: DailyRowDrop<TRowSlug>;
};

type DailyRow<TRowSlug extends string = string> = DailyRows<TRowSlug>[DailyRowType];

interface DailyRowBase<TRowSlug extends string, TType extends DailyRowType> {
    type: TType;
    slug: TRowSlug;
    label?: string;
    save?: boolean;
    empty?: boolean;
    order?: number;
    condition?: boolean;
}

type DailyRowSelect<TRowSlug extends string = string> = DailyRowBase<TRowSlug, "select"> & {
    options: DailyRowSelectOption[];
    unique?: string;
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

type DailyRowDropFeatFilter<TRowSlug extends string = string> =
    DailyRowDropFeat<TRowSlug>["filter"];

type DailyRowDropSpellFilter<TRowSlug extends string> = DailyRowDropSpell<TRowSlug>["filter"];

type DailyRowDropFilters<TRowSlug extends string = string> = {
    feat: DailyRowDropFeatFilter<TRowSlug>;
    spell: DailyRowDropSpellFilter<TRowSlug>;
};

type DailyRowDropFilter<TRowSlug extends string = string> =
    DailyRowDropFilters<TRowSlug>[DailyRowDropType];

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
    rank?: StringNumber[] | "level" | "half" | StringNumber | number | number[];
    traditions?: MagicTradition[];
};

type DailyRowDropSearch = DailyRowDropFeatSearch | DailyRowSpellSearch;

type DailyRowDropType = "feat" | "spell";

type CustomDaily = {
    key: string;
    code: string;
    schema?: string;
};

type PreparedDailyData = {
    items: DailyOptionsItems<string>;
    custom: DailyCustom;
    rows: Record<string, DailyRow>;
};

type PreparedDaily = Daily & {
    prepared: PreparedDailyData;
};

type PreparedDailies = Record<string, PreparedDaily | null>;

type SimplifiableValue = number | StringNumber | "level" | "half";

type ChargesSpellcastingSheetData = SpellcastingSheetDataWithCharges & {
    isStaff: boolean;
    isCharges: boolean;
    uses: { value: number; max: number };
};

export type {
    ChargesSpellcastingSheetData,
    CustomDaily,
    Daily,
    DailyActorFlags,
    DailyAfterItemAddedOptions,
    DailyConfigCheckbox,
    DailyConfigRow,
    DailyConfigRowType,
    DailyConfigRowValue,
    DailyCustom,
    DailyItem,
    DailyMessageGroup,
    DailyMessageOptions,
    DailyOptionsItems,
    DailyProcessOptions,
    DailyRow,
    DailyRowAlert,
    DailyRowCombo,
    DailyRowComboData,
    DailyRowData,
    DailyRowDrop,
    DailyRowDropData,
    DailyRowDropFeat,
    DailyRowDropFeatFilter,
    DailyRowDropFilter,
    DailyRowDropFilters,
    DailyRowDropSpell,
    DailyRowDropType,
    DailyRows,
    DailyRowSelect,
    DailyRowSelectOption,
    DailyRowSelectOptionValue,
    DailyRowType,
    DailyRuleElement,
    PreparedDailies,
    PreparedDaily,
    PreparedDailyData,
    SimplifiableValue,
};
