import { getDisabledDailies } from "actor";
import { filterDailies, PreparedDailies, PreparedDaily } from "dailies";
import {
    DailyRow,
    DailyRowAlert,
    DailyRowComboData,
    DailyRowData,
    DailyRowDrop,
    DailyRowDropData,
    DailyRowDropFeat,
    DailyRowDropSpell,
    DailyRowDropType,
    DailyRowSelectOption,
    DailyRowSelectOptionValue,
    DailyRowType,
    getDailyLabel,
    rowIsOfType,
} from "daily";
import {
    ActorPF2e,
    addListenerAll,
    ApplicationConfiguration,
    ApplicationRenderOptions,
    CharacterPF2e,
    CheckboxData,
    dataToDatasetString,
    error,
    FeatFilters,
    getCompendiumFilters,
    getFlag,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    localize,
    R,
    render,
    SpellFilters,
    stringBoolean,
    stringNumber,
    templateLocalize,
    warning,
} from "module-helpers";
import { DailyConfig, onInterfaceDrop, processDailies } from ".";

class DailyInterface extends foundry.applications.api.ApplicationV2 {
    #actor: CharacterPF2e;
    #dailies: PreparedDailies;
    #dailiesArray: PreparedDaily[];
    #featUuids: string[] = [];
    #settingsApp?: DailyConfig;
    #randomInterval?: NodeJS.Timeout;
    #dropFilters: Record<string, DropFilter> = {};

    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        window: {
            positioned: true,
            resizable: false,
            minimizable: true,
            frame: true,
        },
    };

    static TEMPLATE_ORDER = {
        select: 100,
        combo: 80,
        random: 60,
        alert: 40,
        input: 20,
        notify: 20,
        drop: 0,
    };

    constructor(
        actor: CharacterPF2e,
        dailies: PreparedDailies,
        options: Partial<ApplicationOptions> = {}
    ) {
        options.id = `pf2e-dailies-interface-${actor.uuid}`;
        super(options);

        this.#actor = actor;
        this.#dailies = dailies;
        this.#dailiesArray = filterDailies(dailies);
    }

    get title(): string {
        return localize("interface.title", { actor: this.actor.name });
    }

    get actor(): CharacterPF2e {
        return this.#actor;
    }

    get dropFilters(): Record<string, DropFilter> {
        return this.#dropFilters;
    }

    get dailies(): PreparedDailies {
        return this.#dailies;
    }

    getDailyRow<T extends DailyRow>(daily: string, row: string): T | undefined {
        return this.dailies[daily]?.prepared.rows[row] as T | undefined;
    }

    async compendiumFilterFromElement(el: HTMLElement): Promise<DropFilter | undefined> {
        try {
            const data = el.dataset as RowElementDataset;
            const dailyRow = this.getDailyRow<DailyRowDrop>(data.daily, data.row);
            if (!dailyRow) return;

            const filterKey = `${data.daily}.${data.row}`;

            const dropFilter = (this.dropFilters[filterKey] ??= await (async () => {
                const filter = foundry.utils.deepClone(dailyRow.filter);
                return {
                    daily: data.daily,
                    row: data.row,
                    type: filter.type,
                    filter: await this.#convertToCompendiumFilter(filter),
                };
            })());

            return foundry.utils.deepClone(dropFilter);
        } catch (err) {
            error("error.unexpected");
            console.error(err);
            console.error(`The error occured when trying to open a drop filter.`);
        }
    }

    _onClose() {
        this.#settingsApp?.close();
        clearInterval(this.#randomInterval);
    }

    async _renderFrame(options: ApplicationRenderOptions) {
        const frame = await super._renderFrame(options);

        const configLabel = localize("interface.config");
        const configBtn = `<button type="button" class="header-control"
        data-action="configs" data-tooltip="${configLabel}" aria-label="${configLabel}">
            <i class="fa-solid fa-user-gear"></i>
        </button>`;

        this.window.close.insertAdjacentHTML("beforebegin", configBtn);

        return frame;
    }

    async _prepareContext(options: ApplicationRenderOptions): Promise<DailyContext> {
        const actor = this.actor;

        let hasAlert = false;
        const dailies = this.#dailiesArray;
        const templates: DailyTemplate[] = [];
        const disabled = getDisabledDailies(actor);

        await Promise.all(
            dailies.map(async (daily) => {
                const items = daily.prepared.items;

                daily.label = await getDailyLabel(daily, actor, items);

                if (disabled[daily.key]) return;

                const custom =
                    typeof daily.prepare === "function" ? await daily.prepare(actor, items) : {};
                const rows = await daily.rows(actor, items, custom);

                const dailyTemplate: DailyTemplate = {
                    label: daily.label,
                    rows: [],
                };

                daily.prepared.custom = custom;
                daily.prepared.rows = R.mapToObj(rows, (row) => [row.slug, row]);

                for (const row of rows) {
                    if (typeof row.condition === "boolean" && !row.condition) {
                        continue;
                    }

                    const rowLabel =
                        typeof row.label === "string" ? game.i18n.localize(row.label) : row.slug;

                    const rowTemplate: RowTemplate = {
                        type: row.type,
                        row: row.slug,
                        daily: daily.key,
                        label: rowLabel,
                        order: row.order ?? DailyInterface.TEMPLATE_ORDER[row.type],
                        data: "",
                    };

                    const isSavedRow = row.save !== false;

                    const getSavedFlag = <T extends DailyRowData>() => {
                        return isSavedRow ? getFlag<T>(actor, daily.key, row.slug) : undefined;
                    };

                    const rowData: Partial<RowElementDataset> = {
                        daily: daily.key,
                        type: row.type,
                        row: row.slug,
                        save: stringBoolean(isSavedRow),
                        empty: stringBoolean(row.empty ?? false),
                    };

                    if (rowIsOfType(row, "select", "combo", "random")) {
                        const openedGroups: string[] = [];

                        rowTemplate.options = [];

                        for (const option of row.options) {
                            if ("group" in option) {
                                if (openedGroups.pop()) {
                                    rowTemplate.options.push({ groupEnd: true });
                                }

                                openedGroups.push(option.group);
                                option.group = game.i18n.localize(option.group);
                            } else {
                                option.label = game.i18n.localize(option.label);
                            }

                            rowTemplate.options.push(option);
                        }

                        for (const _ of openedGroups) {
                            rowTemplate.options.push({ groupEnd: true });
                        }

                        if (
                            rowIsOfType(row, "combo", "select") &&
                            row.unique &&
                            rowTemplate.options.length > 1
                        ) {
                            rowTemplate.unique = row.unique;
                        }

                        if (rowIsOfType(row, "combo")) {
                            const { input, selected } = getSavedFlag<DailyRowComboData>() ?? {};
                            const isInput = input ?? true;
                            const option = isInput
                                ? undefined
                                : rowTemplate.options.find(
                                      (option): option is DailyRowSelectOptionValue =>
                                          "value" in option && option.value === selected
                                  );

                            rowTemplate.value = (isInput ? selected : option?.label) ?? "";
                            rowTemplate.selected = (!isInput && option?.value) || "";

                            rowData.input = stringBoolean(isInput);
                        } else if (!row.options.length) {
                            continue;
                        } else {
                            rowTemplate.selected = getSavedFlag<string>() ?? "";
                        }
                    } else if (rowIsOfType(row, "drop")) {
                        const { name, uuid } = R.isPlainObject(row.value)
                            ? row.value
                            : getSavedFlag<DailyRowDropData>() ?? {};

                        if (row.filter.type === "feat") {
                            this.#featUuids ??= R.pipe(
                                this.actor.itemTypes.feat,
                                R.map((feat) => feat.sourceId),
                                R.filter(R.isTruthy)
                            );
                        }

                        rowTemplate.note = row.note;
                        rowTemplate.value = name ?? "";

                        rowData.uuid = uuid ?? "";
                        rowData.droptype = row.filter.type;
                    } else if (rowIsOfType(row, "alert", "notify")) {
                        rowData.save = "false";
                        rowData.empty = "false";

                        delete rowTemplate.unique;
                        rowTemplate.value = row.message;

                        if (rowIsOfType(row, "alert")) {
                            hasAlert ||= true;
                        } else {
                            rowTemplate.color =
                                row.color === true
                                    ? "var(--notify-color)"
                                    : typeof row.color === "string"
                                    ? row.color
                                    : "var(--color-text-primary)";
                        }
                    } else if (rowIsOfType(row, "input")) {
                        rowTemplate.value = getSavedFlag<string>() ?? "";
                    }

                    rowTemplate.data = dataToDatasetString(rowData);

                    dailyTemplate.rows.push(rowTemplate);
                }

                if (dailyTemplate.rows.length) {
                    templates.push(dailyTemplate);
                }
            })
        );

        const rows: RowTemplate[] = [];
        const groups: DailyTemplate[] = [];

        for (const template of templates) {
            if (
                template.rows.length === 1 &&
                !["alert", "notify"].includes(template.rows[0].type)
            ) {
                const row = template.rows[0];
                row.label = template.label;
                rows.push(row);
            } else if (template.rows.length) {
                groups.push(template);
            }
        }

        rows.sort((a, b) => b.order - a.order);
        groups.sort((a, b) => a.rows.length - b.rows.length);

        const hasDailies = !!rows.length || !!groups.length;

        return {
            rows,
            groups,
            i18n: templateLocalize("interface"),
            hasDailies,
            hasAlert,
            canAccept: hasDailies && !hasAlert,
        };
    }

    async _renderHTML(context: DailyContext, options: ApplicationRenderOptions): Promise<string> {
        return render("interface", context);
    }

    _replaceHTML(result: string, content: HTMLElement, options: ApplicationRenderOptions) {
        content.innerHTML = result;
        this.#addEventListeners(content);
    }

    _onClickAction(event: PointerEvent, el: HTMLElement) {
        type EventAction =
            | "accept"
            | "cancel"
            | "clear-field"
            | "configs"
            | "open-browser"
            | "resolve-alert";

        const action = el.dataset.action as EventAction;

        if (action === "accept") {
            this.#accepDailies();
        } else if (action === "cancel") {
            this.close();
        } else if (action === "clear-field") {
            this.#clearField(el);
        } else if (action === "configs") {
            this.#openConfigs();
        } else if (action === "open-browser") {
            this.#openBrowser(el);
        } else if (action === "resolve-alert") {
            this.#resolveAlert(el);
        }
    }

    async #accepDailies() {
        const html = this.element;
        const labelElements = html.querySelectorAll("label.empty");

        for (const labelEl of labelElements) {
            labelEl.classList.remove("empty");
        }

        const emptyRows = htmlQueryAll<HTMLInputElement | HTMLSelectElement>(
            html,
            "[data-empty='false']"
        ).filter((el) => el.value.trim() === "");

        if (emptyRows.length) {
            warning("interface.error.empty");

            for (const inputEl of emptyRows) {
                const { row } = inputEl.dataset as RowElementDataset;
                const labelEl = htmlQuery(
                    htmlClosest(inputEl, ".group"),
                    `label[data-row="${row}"]`
                );

                labelEl?.classList.add("empty");
            }

            return;
        }

        this.element.classList.add("disabled");
        await processDailies.call(this);
        this.close();
    }

    async #openBrowser(el: HTMLElement) {
        const inputEl = htmlQuery(htmlClosest(el, ".drop"), "input");
        if (!inputEl) return;

        const compendium = await this.compendiumFilterFromElement(inputEl);

        if (compendium) {
            game.pf2e.compendiumBrowser.openTab(
                // @ts-ignore
                compendium.type,
                { filter: compendium.filter }
            );
        }
    }

    async #convertToCompendiumFilter<T extends DailyRowDropType>(
        dropFilter: DailyRowDropFilters[T]
    ) {
        const type = dropFilter.type;
        const compendiumFilter = await getCompendiumFilters(type);

        if (filterIsOfType(dropFilter, "spell")) {
            const rank = Array.isArray(dropFilter.search.rank)
                ? dropFilter.search.rank.map(stringNumber)
                : typeof dropFilter.search.rank === "string"
                ? simplifyValue(this.actor, dropFilter.search.rank)
                : dropFilter.search.rank;

            dropFilter.search.rank = Array.isArray(rank)
                ? rank
                : typeof rank === "number"
                ? R.range(1, rank + 1).map(stringNumber)
                : undefined;
        }

        const checkboxes = Object.entries(compendiumFilter.checkboxes).concat([
            ["source", compendiumFilter.source],
        ]);
        for (const checkboxEntry of checkboxes) {
            const [checkboxName, filterCheckbox] = checkboxEntry as [
                keyof typeof compendiumFilter.checkboxes,
                CheckboxData
            ];
            const searchCheckbox = dropFilter.search[checkboxName];

            if (!searchCheckbox) {
                filterCheckbox.isExpanded = false;
                continue;
            }

            filterCheckbox.selected = searchCheckbox;
            filterCheckbox.isExpanded = true;

            for (const x of searchCheckbox) {
                const filterCheckboxOption = filterCheckbox.options[x];

                if (filterCheckboxOption) {
                    filterCheckboxOption.selected = true;
                }
            }
        }

        if ("traits" in dropFilter.search) {
            const traitsFilter = compendiumFilter.traits;
            const searchTraits = Array.isArray(dropFilter.search.traits)
                ? { selected: dropFilter.search.traits }
                : dropFilter.search.traits;

            if (searchTraits) {
                traitsFilter.conjunction = searchTraits.conjunction ?? "and";

                for (const select of searchTraits.selected) {
                    const selection =
                        typeof select === "string" ? { value: select, not: undefined } : select;
                    traitsFilter.selected.push(selection as any);
                }
            }
        }

        if ("level" in compendiumFilter && "level" in dropFilter.search) {
            const levelFilter = compendiumFilter.level;
            const searchLevel = isSimplifiableValue(dropFilter.search.level)
                ? { min: 0, max: simplifyValue(this.actor, dropFilter.search.level) ?? 20 }
                : dropFilter.search.level;

            if (searchLevel) {
                levelFilter.from = searchLevel.min ?? 0;
                levelFilter.to = searchLevel.max ?? 20;
                levelFilter.isExpanded = true;
            }
        }

        return compendiumFilter;
    }

    #clearField(btnEl: HTMLElement) {
        const inputEl = htmlQuery(btnEl.parentElement, "input");
        if (!inputEl) return;

        inputEl.dataset.tooltip = "";
        inputEl.classList.remove("exists");
        inputEl.value = "";
        inputEl.dataset.uuid = "";

        btnEl.classList.add("disabled");
    }

    async #resolveAlert(el: HTMLElement) {
        const data = el.dataset as RowElementDataset;
        const row = this.getDailyRow<DailyRowAlert>(data.daily, data.row);

        if (await row?.resolve()) {
            this.render({ position: { height: "auto" } });
        }
    }

    async #openConfigs() {
        if (this.#settingsApp) {
            this.#settingsApp.bringToFront();
            return;
        }

        const actor = this.actor;
        const id = `pf2e-dailies-settings-${actor.uuid}`;

        this.#settingsApp = new DailyConfig(actor, this.#dailiesArray, { id });
        this.#settingsApp.addEventListener("update", () => {
            this.render({ position: { height: "auto" } });
        });
        this.#settingsApp.addEventListener(
            "close",
            () => {
                this.#settingsApp = undefined;
            },
            { once: true }
        );
        this.#settingsApp.render(true);
    }

    #onUniqueChange(el: HTMLSelectElement) {
        const uniqueTag = el.dataset.unique as string;
        const uniqueOptions = new Set<string>();
        const selectElements = htmlClosest(el, ".dailies")?.querySelectorAll<HTMLSelectElement>(
            `select[data-unique="${uniqueTag}"]`
        );

        for (const selectEl of selectElements ?? []) {
            let index = selectEl.selectedIndex;
            const selectOptions = selectEl.options;
            const maxIndex = selectEl.options.length - 1;

            const optionUniqueValue = () => {
                const option = selectOptions[index];
                return option.dataset.skipUnique === "true"
                    ? undefined
                    : option.dataset.unique ?? option.value;
            };

            const optionExists = () => {
                const value = optionUniqueValue();
                return value && uniqueOptions.has(value);
            };

            while (optionExists() && index > 0) {
                index -= 1;
            }

            while (optionExists() && index < maxIndex) {
                index += 1;
            }

            if (optionExists()) continue;

            const finalValue = optionUniqueValue();

            if (finalValue) {
                uniqueOptions.add(finalValue);
            }

            if (selectEl.selectedIndex !== index) {
                selectEl.selectedIndex = index;
            }
        }

        for (const selectEl of selectElements ?? []) {
            const index = selectEl.selectedIndex;
            const selectOptions = selectEl.options;

            for (let i = 0; i < selectOptions.length; i++) {
                if (i === index) continue;

                const option = selectOptions[i];

                option.disabled = uniqueOptions.has(option.dataset.unique ?? option.value);
            }
        }
    }

    #onInputChange(el: HTMLInputElement) {
        const clear = htmlQuery(htmlClosest(el, ".input"), ".clear");
        clear?.classList.toggle("disabled", !el.value.trim());
    }

    #onComboInputChange(inputEl: HTMLInputElement) {
        const value = inputEl.value.trim().toLowerCase();
        const selectEl = htmlQuery<HTMLSelectElement>(htmlClosest(inputEl, ".combo"), "select");
        if (!selectEl) return;

        const option = value
            ? Array.from(selectEl.options).find(
                  (option) => option.value === value || option.text.toLowerCase() === value
              )
            : undefined;

        if (option) {
            selectEl.value = option.value;
            inputEl.value = option.text;
            inputEl.dataset.input = "false";
        } else {
            selectEl.value = "";
            inputEl.dataset.input = "true";
        }
    }

    #onComboSelectChange(selectEl: HTMLSelectElement) {
        const inputEl = htmlQuery(htmlClosest(selectEl, ".combo"), "input");
        if (!inputEl) return;

        inputEl.dataset.input = "false";
        inputEl.value = selectEl.options[selectEl.selectedIndex].text;
    }

    #addEventListeners(html: HTMLElement) {
        addListenerAll(html, ".group > .drop", "drop", onInterfaceDrop.bind(this));
        addListenerAll(html, "[data-unique]", "change", this.#onUniqueChange.bind(this));
        addListenerAll(html, ".combo input", "change", this.#onComboInputChange.bind(this));
        addListenerAll(html, ".combo select", "change", this.#onComboSelectChange.bind(this));
        addListenerAll(html, ".input input[type='text']", "change", this.#onInputChange.bind(this));

        addListenerAll(
            html,
            "input[type='text']",
            "keyup",
            (el, event) => event.key === "Enter" && el.blur()
        );

        const randomElements = html.querySelectorAll<HTMLSelectElement>("select.random");
        if (randomElements.length) {
            this.#randomInterval = setInterval(() => {
                for (const randomElement of randomElements) {
                    randomElement.selectedIndex =
                        (randomElement.selectedIndex + 1) % randomElement.options.length;
                }
            }, 1000);
        }

        const dropFeatInputs = html.querySelectorAll<HTMLInputElement>(
            "input[data-droptype='feat']"
        );
        for (const dropFeatInput of dropFeatInputs) {
            const uuid = dropFeatInput.dataset.uuid;
            if (uuid && this.#featUuids.includes(uuid)) {
                dropFeatInput.classList.add("exists");
                dropFeatInput.dataset.tooltip = dropFeatInput.dataset.cacheTooltip;
            }
        }

        const processedUniques: string[] = [];
        const uniqueSelects = html.querySelectorAll<HTMLSelectElement>("[data-unique]");
        for (const selectEl of uniqueSelects) {
            const { unique, dailykey } = selectEl.dataset as RowElementDataset;
            const uniqueTag = `${dailykey}.${unique}`;

            if (processedUniques.includes(uniqueTag)) continue;

            this.#onUniqueChange(selectEl);
            processedUniques.push(uniqueTag);
        }
    }
}

function filterIsOfType<T extends DailyRowDropType>(
    filter: DailyRowDropFilter,
    type: T
): filter is DailyRowDropFilters[T] {
    return filter.type === type;
}

function simplifyValue(actor: ActorPF2e, value: SimplifiableValue): number | undefined {
    if (typeof value === "number") {
        return value;
    }

    if (value === "level") {
        return actor.level;
    }

    if (value === "half") {
        return Math.max(1, Math.floor(actor.level / 2));
    }

    const numbered = Number(value) || 0;
    return Number.isNaN(numbered) ? undefined : numbered;
}

function isSimplifiableValue(value: any): value is SimplifiableValue {
    return (
        typeof value === "number" ||
        value === "level" ||
        value === "half" ||
        (typeof value === "string" && !Number.isNaN(Number(value)))
    );
}

type SimplifiableValue = number | `${number}` | "level" | "half";

type DailyRowDropFilter<TRowSlug extends string = string> =
    DailyRowDropFilters<TRowSlug>[DailyRowDropType];

type DailyRowDropFilters<TRowSlug extends string = string> = {
    feat: DailyRowDropFeatFilter<TRowSlug>;
    spell: DailyRowDropSpellFilter<TRowSlug>;
};

type DailyRowDropFeatFilter<TRowSlug extends string> = DailyRowDropFeat<TRowSlug>["filter"];

type DailyRowDropSpellFilter<TRowSlug extends string> = DailyRowDropSpell<TRowSlug>["filter"];

type RowElementDatasetBase = {
    daily: string;
    row: string;
    save: `${boolean}`;
};

type RowElementDataset = RowElementDatasetBase & {
    type: DailyRowType;
    dailykey: string;
    droptype: DailyRowDropType;
    unique: string;
    input: `${boolean}`;
    uuid: string;
    empty: `${boolean}`;
};

type DailyContext = {
    rows: RowTemplate[];
    groups: DailyTemplate[];
    i18n: (
        key: string,
        {
            hash,
        }: {
            hash: Record<string, string>;
        }
    ) => string;
    hasDailies: boolean;
    hasAlert: boolean;
    canAccept: boolean;
};

type DailyTemplate = {
    label: string;
    rows: RowTemplate[];
};

type RowTemplate = {
    type: DailyRowType;
    label: string;
    daily: string;
    row: string;
    value?: string;
    note?: string;
    selected?: string;
    unique?: string;
    order: number;
    data: string;
    options?: (DailyRowSelectOption | { groupEnd: true })[];
    color?: string;
};

type DropFilter = {
    daily: string;
    row: string;
    type: DailyRowDropType;
    filter: FeatFilters | SpellFilters;
};

export { DailyInterface };
export type { DropFilter, RowElementDataset };
