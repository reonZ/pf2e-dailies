import {
    ApplicationConfiguration,
    ApplicationRenderOptions,
    CharacterPF2e,
    CheckboxData,
    CompendiumBrowserFeatTab,
    FeatFilters,
    FeatOrFeatureCategory,
    FeatPF2e,
    FeatSource,
    ItemPF2e,
    ItemSourcePF2e,
    MODULE,
    MagicTradition,
    OneToTen,
    R,
    Rarity,
    SkillSlug,
    SpellFilters,
    SpellPF2e,
    SpellTrait,
    addListener,
    addListenerAll,
    createChatLink,
    createHTMLElement,
    createSpellcastingWithHighestStatisticSource,
    dataToDatasetString,
    elementDataset,
    error,
    getCompendiumFilters,
    getFlag,
    getFlagProperty,
    getTranslatedSkills,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    htmlQueryInClosest,
    localize,
    localizeIfExist,
    render,
    setFlagProperty,
    stringBoolean,
    stringNumber,
    subLocalize,
    templateLocalize,
    warn,
} from "module-helpers";
import {
    createUpdateCollection,
    getDisabledDailies,
    isSimplifiableValue,
    simplifyValue,
} from "../api";
import { filterDailies } from "../dailies";
import { filterIsOfType, rowIsOfType } from "../daily";
import type {
    DailyActorFlags,
    DailyMessageGroup,
    DailyProcessOptions,
    DailyRow,
    DailyRowAlert,
    DailyRowComboData,
    DailyRowData,
    DailyRowDrop,
    DailyRowDropData,
    DailyRowDropFilters,
    DailyRowDropType,
    DailyRowSelectOption,
    DailyRowSelectOptionValue,
    DailyRowType,
    DailyRuleElement,
    PreparedDailies,
    PreparedDaily,
} from "../types";
import { utils } from "../utils";
import { DailyConfig } from "./config";

const TEMPLATE_ORDER = {
    select: 100,
    combo: 80,
    random: 60,
    alert: 40,
    input: 20,
    notify: 20,
    drop: 0,
};

class DailyInterface extends foundry.applications.api.ApplicationV2 {
    #actor: CharacterPF2e;
    #dailies: PreparedDailies;
    #dailiesArray: PreparedDaily[];
    #settingsApp: DailyConfig | null = null;
    #randomInterval?: NodeJS.Timeout;
    #featUuids!: string[];
    #dropFilters: Record<
        string,
        {
            daily: string;
            row: string;
            type: DailyRowDropType;
            filter: FeatFilters | SpellFilters;
        }
    > = {};

    constructor(
        actor: CharacterPF2e,
        dailies: PreparedDailies,
        options: Partial<ApplicationOptions> = {}
    ) {
        super(options);

        this.#actor = actor;
        this.#dailies = dailies;
        this.#dailiesArray = filterDailies(dailies);
    }

    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        window: {
            positioned: true,
            resizable: true,
            minimizable: true,
            frame: true,
        },
        actions: {
            configs: this.#openConfigs,
        },
    };

    static async #openConfigs(this: DailyInterface, event: PointerEvent, target: HTMLElement) {
        if (this.#settingsApp) {
            this.#settingsApp.bringToFront();
            return;
        }

        const actor = this.actor;
        const id = `pf2e-dailies-settings-${actor.uuid}`;

        this.#settingsApp = new DailyConfig(actor, this.#dailiesArray, { id });
        this.#settingsApp.addEventListener("update", () =>
            this.render({ position: { height: "auto" } })
        );
        this.#settingsApp.addEventListener("close", () => (this.#settingsApp = null), {
            once: true,
        });
        this.#settingsApp.render(true);
    }

    get title() {
        return localize("interface.title", { actor: this.actor.name });
    }

    get actor() {
        return this.#actor;
    }

    async _renderFrame(options: ApplicationRenderOptions) {
        const frame = await super._renderFrame(options);

        const configLabel = localize("interface.config");
        const configBtn = `<button type="button" class="header-control fa-solid fa-user-gear" 
        data-action="configs" data-tooltip="${configLabel}" aria-label="${configLabel}"></button>`;

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

                daily.label =
                    typeof daily.label === "function"
                        ? await daily.label(actor, items)
                        : typeof daily.label === "string"
                        ? game.i18n.localize(daily.label)
                        : localizeIfExist("builtin", daily.key) ?? daily.key;

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
                        order: row.order ?? TEMPLATE_ORDER[row.type],
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
                        const { name, uuid } = getSavedFlag<DailyRowDropData>() ?? {};

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
        const wrapper = createHTMLElement("div", { innerHTML: result });
        content.replaceChildren(...wrapper.children);
        this.#activateListeners(content);
    }

    _onClose() {
        this.#settingsApp?.close();
        clearInterval(this.#randomInterval);
    }

    #activateListeners(html: HTMLElement) {
        addListenerAll(html, ".group > .drop", "drop", this.#onDrop.bind(this));

        addListener(html, "[data-action='accept']", () => this.#onAccept(html));
        addListener(html, "[data-action='cancel']", () => this.close());

        addListenerAll(
            html,
            "input[type='text']",
            "keyup",
            (event, el) => event.key === "Enter" && el.blur()
        );

        addListenerAll(html, "[data-action='resolve-alert']", this.#onResolveAlert.bind(this));
        addListenerAll(html, "[data-action='clear-field']", this.#onClearField.bind(this));
        addListenerAll(html, "[data-action='open-browser']", this.#onOpenBrowser.bind(this));
        addListenerAll(html, ".combo input", "change", this.#onComboInputChange.bind(this));
        addListenerAll(html, ".combo select", "change", this.#onComboSelectChange.bind(this));
        addListenerAll(html, "[data-unique]", "change", this.#onUniqueChange.bind(this));
        addListenerAll(html, ".input input[type='text']", "change", this.#onInputChange.bind(this));

        const processedUniques: string[] = [];
        const uniqueSelects = html.querySelectorAll<HTMLSelectElement>("[data-unique]");

        for (const selectEl of uniqueSelects) {
            const { unique, dailykey } = elementDataset<RowElementDataset>(selectEl);
            const uniqueTag = `${dailykey}.${unique}`;

            if (processedUniques.includes(uniqueTag)) continue;

            this.#onUniqueChange(null, selectEl);
            processedUniques.push(uniqueTag);
        }

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
    }

    async #onResolveAlert(event: Event, el: HTMLInputElement) {
        const data = elementDataset<RowElementDataset>(el);
        const row = this.#getDailyRow<DailyRowAlert>(data.daily, data.row);
        const resolved = await row.resolve();
        if (resolved) this.render({ position: { height: "auto" } });
    }

    #onInputChange(event: Event, el: HTMLInputElement) {
        htmlQueryInClosest(el, ".input", ".clear")!.classList.toggle("disabled", !el.value.trim());
    }

    #onUniqueChange(event: Event | null, el: HTMLSelectElement) {
        const uniqueTag = elementDataset(el).unique;
        const uniqueOptions = new Set<string>();
        const selectElements = htmlClosest(el, ".dailies")!.querySelectorAll<HTMLSelectElement>(
            `select[data-unique="${uniqueTag}"]`
        );

        for (const selectEl of selectElements) {
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

        for (const selectEl of selectElements) {
            const index = selectEl.selectedIndex;
            const selectOptions = selectEl.options;

            for (let i = 0; i < selectOptions.length; i++) {
                if (i === index) continue;

                const option = selectOptions[i];

                option.disabled = uniqueOptions.has(option.dataset.unique ?? option.value);
            }
        }
    }

    #onComboInputChange(event: Event, inputEl: HTMLInputElement) {
        const value = inputEl.value.trim().toLowerCase();
        const selectEl = htmlQueryInClosest<HTMLSelectElement>(inputEl, ".combo", "select")!;
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

    #onComboSelectChange(event: Event, selectEl: HTMLSelectElement) {
        const inputEl = htmlQueryInClosest<HTMLInputElement>(selectEl, ".combo", "input")!;
        inputEl.dataset.input = "false";
        inputEl.value = selectEl.options[selectEl.selectedIndex].text;
    }

    async #onOpenBrowser(event: Event, el: HTMLElement) {
        const inputEl = htmlQueryInClosest(el, ".drop", "input")!;
        const compendium = await this.#compendiumFilterFromElement(inputEl);

        if (compendium) {
            game.pf2e.compendiumBrowser.openTab(
                // @ts-ignore
                compendium.type,
                { filter: compendium.filter }
            );
        }
    }

    #onClearField(event: Event, btnEl: HTMLElement) {
        const inputEl = htmlQuery<HTMLInputElement>(btnEl.parentElement, "input")!;

        inputEl.dataset.tooltip = "";
        inputEl.classList.remove("exists");
        inputEl.value = "";
        inputEl.dataset.uuid = "";

        btnEl.classList.add("disabled");
    }

    async #onAccept(html: HTMLElement) {
        const labelElements = html.querySelectorAll("label.empty");

        for (const labelEl of labelElements) {
            labelEl.classList.remove("empty");
        }

        const emptyRows = htmlQueryAll<HTMLInputElement | HTMLSelectElement>(
            html,
            "[data-empty='false']"
        ).filter((el) => el.value.trim() === "");

        if (emptyRows.length) {
            warn("interface.error.empty");

            for (const inputEl of emptyRows) {
                const { row } = elementDataset<RowElementDataset>(inputEl);
                const labelEl = htmlQueryInClosest(inputEl, ".group", `label[data-row="${row}"]`)!;
                labelEl.classList.add("empty");
            }

            return;
        }

        this.#lock();
        await this.#processDailies(html);
        this.close();
    }

    async #processDailies(html: HTMLElement) {
        const rowElements = html.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            "[data-daily]"
        );

        const flags: Record<string, Record<string, DailyRowData>> = {};
        const extraFlags: Record<string, any> = {};
        const dailies: Record<
            string,
            {
                daily: PreparedDaily;
                rows: Record<string, DailyRowData>;
            }
        > = {};

        for (const rowElement of rowElements) {
            let row: DailyRowData;

            if (rowElementIsOFType(rowElement, "drop")) {
                row = {
                    uuid: rowElement.dataset.uuid,
                    name: rowElement.value,
                };
            } else if (rowElementIsOFType(rowElement, "combo")) {
                const isInput = rowElement.dataset.input === "true";
                const selected = isInput
                    ? rowElement.value.trim()
                    : htmlQueryInClosest<HTMLSelectElement>(rowElement, ".combo", "select")!.value;

                row = {
                    selected,
                    input: isInput,
                };
            } else if (rowElementIsOFType(rowElement, "select", "input")) {
                row = rowElement.value.trim();
            } else if (rowElementIsOFType(rowElement, "random")) {
                row = utils.selectRandomOption(rowElement);
            } else if (rowElementIsOFType(rowElement, "notify")) {
                row = true;
            } else {
                continue;
            }

            const data = rowElement.dataset as RowElementDatasetBase;

            dailies[data.daily] ??= {
                daily: this.#dailies[data.daily]!,
                rows: {},
            };

            dailies[data.daily].rows[data.row] = row;

            if (data.save === "true") {
                flags[data.daily] ??= {};
                flags[data.daily][data.row] = row;
            }
        }

        const actor = this.actor;
        const deletedItems: string[] = [];
        const addedItems: (PreCreate<ItemSourcePF2e> | ItemSourcePF2e)[] = [];
        const itemsRules = new Map<string, DailyRuleElement[]>();
        const [updatedItems, updateItem] = createUpdateCollection();
        const rawMessages: { message: string; order: number }[] = [];
        const addedItemIds: string[] = [];
        const temporaryDeleted: Record<string, ItemSourcePF2e> = {};

        const messageGroups: Record<string, DailyMessageGroup> = {
            languages: { order: 80, messages: [] },
            skills: { order: 70, messages: [] },
            resistances: { order: 60, messages: [] },
            feats: { order: 50, messages: [] },
            spells: { order: 40, messages: [] },
            scrolls: { order: 30, messages: [] },
        };

        const addItemToActor = (
            source: PreCreate<ItemSourcePF2e> | ItemSourcePF2e,
            temporary = true
        ) => {
            if (temporary) {
                setFlagProperty(source, "temporary", true);
            }

            addedItems.push(source);
        };

        const getRules = (item: ItemPF2e) => {
            const id = item.id;
            const existing = itemsRules.get(id);

            if (existing) {
                return existing;
            }

            const rules = foundry.utils.deepClone(item._source.system.rules);

            for (let i = rules.length - 1; i >= 0; i--) {
                if (MODULE.id in rules[i]) {
                    rules.splice(i, 1);
                }
            }

            itemsRules.set(id, rules);
            return rules;
        };

        const processOptions = (
            daily: PreparedDaily,
            rows: Record<string, DailyRowData>
        ): Omit<DailyProcessOptions, "addItem" | "addFeat" | "addRule"> => {
            const items = daily.prepared.items;
            const custom = daily.prepared.custom;

            return {
                actor,
                items,
                custom,
                // @ts-ignore
                rows,
                messages: {
                    add: (group, message) => {
                        messageGroups[group] ??= { order: 0, messages: [] };
                        messageGroups[group].messages.push(message);
                    },
                    addGroup: (name, label, order = 0) => {
                        if (name in messageGroups) {
                            messageGroups[name].label ??= label;
                            messageGroups[name].order ??= order;
                        } else {
                            messageGroups[name] = {
                                label,
                                order,
                                messages: [],
                            };
                        }
                    },
                    addRaw: (message, order: number = 1) => {
                        rawMessages.push({ message, order });
                    },
                },
                updateItem,
                deleteItem: (item, temporary = false) => {
                    if (temporary) {
                        temporaryDeleted[item.id] = item.toObject();
                    }

                    deletedItems.push(item.id);
                },
                removeRule: (item: ItemPF2e, signature: (rule: DailyRuleElement) => boolean) => {
                    const rules = getRules(item);

                    for (let i = rules.length - 1; i >= 0; i--) {
                        const rule = rules[i];

                        if (signature(rule)) {
                            rules.splice(i, 1);
                        }
                    }
                },
                setExtraFlags: (data: Record<string, any>) => {
                    foundry.utils.mergeObject((extraFlags[daily.key] ??= {}), data);
                },
            };
        };

        await Promise.all(
            Object.values(dailies).map(({ daily, rows }) => {
                const addItem = (
                    source: PreCreate<ItemSourcePF2e> | ItemSourcePF2e,
                    temporary?: boolean
                ) => {
                    setFlagProperty(source, "daily", daily.key);
                    addItemToActor(source, temporary);
                };

                const addFeat = (
                    source: PreCreate<FeatSource> | FeatSource,
                    parent?: ItemPF2e | null,
                    temporary = true
                ) => {
                    if (parent?.isOfType("feat")) {
                        const parentId = parent.id;
                        foundry.utils.setProperty(source, "flags.pf2e.grantedBy", {
                            id: parentId,
                            onDelete: "cascade",
                        });
                        setFlagProperty(source, "grantedBy", parentId);
                    }
                    addItem(source, temporary);
                };

                try {
                    const globalOptions = processOptions(daily, rows);
                    const options = R.merge(globalOptions, {
                        addItem,
                        addFeat,
                        addRule: (item: ItemPF2e, source: DailyRuleElement) => {
                            source[MODULE.id] = daily.key;
                            getRules(item).push(source);
                        },
                        replaceFeat: (
                            original: FeatPF2e,
                            source: PreCreate<FeatSource> | FeatSource
                        ) => {
                            addFeat(source, original.grantedBy, false);
                            globalOptions.deleteItem(original);
                        },
                    });

                    return daily.process(options);
                } catch (err) {
                    error("error.unexpected");
                    console.error(err);
                    console.error(`The error occured during processing of ${daily.key}`);
                }
            })
        );

        let hasOrphanSpells = false;
        const entryIdentifier = foundry.utils.randomID();

        for (const source of addedItems) {
            if (
                source.type === "spell" &&
                !foundry.utils.getProperty(source, "system.location.value") &&
                !getFlagProperty(source, "identifier")
            ) {
                hasOrphanSpells = true;
                setFlagProperty(source, "identifier", entryIdentifier);
            }
        }

        if (hasOrphanSpells) {
            const source = createSpellcastingWithHighestStatisticSource(actor, {
                name: localize("spellEntry.name"),
            });

            if (source) {
                setFlagProperty(source, "temporary", true);
                setFlagProperty(source, "identifier", entryIdentifier);
                addedItems.push(source);
            }
        }

        const currentFocus = actor.system.resources.focus;
        const currentMaxFocus = Math.clamp(currentFocus.max, 0, currentFocus.cap);

        let hasFocusSpells = currentMaxFocus;

        const actualAddedItems = addedItems.length
            ? await actor.createEmbeddedDocuments("Item", addedItems)
            : [];

        if (actualAddedItems.length) {
            for (const item of actualAddedItems) {
                if (getFlag(item, "temporary")) {
                    addedItemIds.push(item.id);
                }
            }

            for (const item of actualAddedItems) {
                if (item.isOfType("feat")) {
                    const parentId = getFlag<string>(item, "grantedBy");

                    if (parentId) {
                        const slug = game.pf2e.system.sluggify(item.name, { camel: "dromedary" });
                        const path = `flags.pf2e.itemGrants.${slug}`;

                        updateItem({
                            _id: parentId,
                            [path]: { id: item.id, onDelete: "detach" },
                        });
                    }
                } else if (item.isOfType("spellcastingEntry")) {
                    const identifier = getFlag(item, "identifier");
                    if (!identifier) continue;

                    const spells = actualAddedItems.filter(
                        (spell): spell is SpellPF2e<CharacterPF2e> =>
                            spell.isOfType("spell") && getFlag(spell, "identifier") === identifier
                    );

                    for (const spell of spells) {
                        const rank = getFlag<OneToTen>(spell, "rank");
                        const update: EmbeddedDocumentUpdateData = {
                            _id: spell.id,
                            "system.location.value": item.id,
                            "system.location.heightenedLevel": rank,
                        };

                        if (getFlag(spell, "signature")) {
                            update["system.location.signature"] = true;
                        }

                        updateItem(update);
                    }
                } else if (
                    hasFocusSpells < currentFocus.cap &&
                    item.isOfType("spell") &&
                    item.system.traits.value.includes("focus")
                ) {
                    hasFocusSpells += 1;
                }
            }

            await Promise.all(
                Object.values(dailies).map(({ daily, rows }) => {
                    if (!R.isFunction(daily.afterItemAdded)) return;

                    try {
                        const options = R.merge(processOptions(daily, rows), {
                            addedItems: actualAddedItems.filter(
                                (item) => getFlag(item, "daily") === daily.key
                            ),
                        });

                        return daily.afterItemAdded(options);
                    } catch (err) {
                        error("error.unexpected");
                        console.error(err);
                        console.error(`The error occured during processing of ${daily.key}`);
                    }
                })
            );
        }

        for (const [id, rules] of itemsRules) {
            updateItem({ _id: id, "system.rules": rules });
        }

        if (updatedItems.size) {
            await actor.updateEmbeddedDocuments("Item", updatedItems.contents);
        }

        if (deletedItems.length) {
            await actor.deleteEmbeddedDocuments("Item", deletedItems);
        }

        const messages = Object.entries(messageGroups);
        const chatGroups = rawMessages.map(({ message, order }) => ({
            message: `<p>${message}</p>`,
            order,
        }));

        for (const [type, group] of messages) {
            if (!group.messages.length) continue;

            const groupLabel = group.label
                ? game.i18n.localize(group.label)
                : localizeIfExist("message.groups", type) ?? localize("message.gained", { type });

            let message = `<p><strong>${groupLabel}</strong></p>`;

            for (const messageOptions of group.messages) {
                message += "<p>";

                const label = messageOptions.label?.trim();

                if ("uuid" in messageOptions && messageOptions.uuid) {
                    message += createChatLink(messageOptions.uuid, { label });
                } else if (label) {
                    message += ` ${label}`;
                }

                if (messageOptions.selected) {
                    message += `<i class="fa-solid fa-caret-right"></i>${messageOptions.selected}`;
                }

                if (messageOptions.random) {
                    message += '<i class="fa-solid fa-dice-d20"></i>';
                }

                message += "</p>";
            }

            chatGroups.push({ message, order: group.order });
        }

        const preface = localize(chatGroups.length ? "message.changes" : "message.noChanges");

        chatGroups.unshift({ message: preface, order: Infinity });
        chatGroups.sort((a, b) => b.order - a.order);

        const ChatMessagePF2e = getDocumentClass("ChatMessage");
        const chatContent = chatGroups.map((group) => group.message).join("<hr />");

        await ChatMessagePF2e.create({
            content: `<div class="pf2e-dailies-summary">${chatContent}</div>`,
            speaker: ChatMessagePF2e.getSpeaker({ actor }),
        });

        const actorUpdates: Record<string, any> = {};

        if (currentMaxFocus !== hasFocusSpells) {
            const newMaxValue = Math.min(hasFocusSpells, currentFocus.cap);
            const newValue = currentFocus.value + (newMaxValue - currentMaxFocus);

            actorUpdates["system.resources.focus.max"] = newMaxValue;

            if (newValue !== currentFocus.value) {
                actorUpdates["system.resources.focus.value"] = newValue;
            }
        }

        setFlagProperty<DailyActorFlags>(actorUpdates, {
            ...flags,
            extra: extraFlags,
            rested: false,
            addedItems: addedItemIds,
            temporaryDeleted,
            tooltip: await TextEditor.enrichHTML(chatContent),
        });

        await actor.update(actorUpdates);
    }

    #lock() {
        this.element.classList.add("disabled");
    }

    async #onDrop(event: DragEvent, el: HTMLElement) {
        const localize = subLocalize("interface.drop.error");
        const target = htmlQuery<HTMLInputElement>(el, "input");
        if (!target) return;

        const data = TextEditor.getDragEventData(event);

        if (data?.type !== "Item" || typeof data.uuid !== "string") {
            return localize.error("wrongDataType");
        }

        const item = await fromUuid<SpellPF2e | FeatPF2e>(data.uuid);
        const compendium = await this.#compendiumFilterFromElement(target);

        if (!item || !compendium) {
            return localize.error("wrongDataType");
        }

        if (item.parent) {
            return localize.error("wrongSource");
        }

        if (item.type !== compendium.type) {
            return this.#dropDataWarning(
                "type",
                game.i18n.localize(`TYPES.Item.${compendium.type}`),
                game.i18n.localize(`TYPES.Item.${item.type}`)
            );
        }

        const dailyRow = this.#getDailyRow<DailyRowDrop>(compendium.daily, compendium.row);
        if (typeof dailyRow.onDrop === "function") {
            // @ts-ignore
            const result = await dailyRow.onDrop(item, this.actor);

            if (result === false) {
                return localize.warn("exclude", { item: item.name });
            }
            if (typeof result === "string") {
                return ui.notifications.warn(result);
            }
        }

        const isFeat = item.isOfType("feat");
        const isValid = isFeat
            ? this.#validateFeat(item, compendium.filter as FeatFilters)
            : this.#validateSpell(item, compendium.filter as SpellFilters);

        if (!isValid) return;

        target.value = item.name;
        target.dataset.uuid = item.uuid;
        htmlQueryInClosest(target, ".drop", ".clear")!.classList.remove("disabled");

        if (isFeat) {
            const exists = !!this.actor.itemTypes.feat.find((feat) => feat.sourceId === data.uuid);
            target.classList.toggle("exists", exists);
            target.dataset.tooltip = exists ? target.dataset.cacheTooltip : "";
        }
    }

    #dropDataWarning(type: string, need?: string | string[], has?: string | string[]) {
        const localizedType = localize("interface.drop.error.type", type);
        const formattedNeed = Array.isArray(need)
            ? need.length === 1
                ? need[0]
                : `[${need.join(", ")}]`
            : need;
        const formattedHas = Array.isArray(has)
            ? has.length === 1
                ? has[0]
                : `[${has.join(", ")}]`
            : has;
        const localizedHas = formattedHas || localize("interface.drop.error.none");
        const localizedRequire =
            need && has
                ? localize("interface.drop.error.require", {
                      need: formattedNeed,
                      has: localizedHas,
                  })
                : need
                ? localize("interface.drop.error.missing", { need: formattedNeed })
                : localize("interface.drop.error.invalid", { has: localizedHas });

        warn("interface.drop.error.wrongData", {
            type: localizedType,
            require: localizedRequire,
        });
    }

    #validateDefault(item: FeatPF2e | SpellPF2e, filter: FeatFilters | SpellFilters) {
        const { checkboxes, source, traits } = filter;
        const tab = game.pf2e.compendiumBrowser.tabs[item.type as "spell" | "feat"];
        const itemTraits = item.system.traits.value.map((t: string) => t.replace(/^hb_/, ""));

        if (
            !(tab as CompendiumBrowserFeatTab)["filterTraits"](
                itemTraits,
                traits.selected,
                traits.conjunction
            )
        ) {
            warn("interface.drop.error.wrongTraits");
            return false;
        }

        const filterRarity = checkboxes.rarity.selected as Rarity[];
        if (filterRarity.length && !filterRarity.includes(item.rarity)) {
            this.#dropDataWarning(
                "rarity",
                filterRarity.map((x) => game.i18n.localize(CONFIG.PF2E.rarityTraits[x])),
                game.i18n.localize(CONFIG.PF2E.rarityTraits[item.rarity])
            );
            return false;
        }

        const filterSource = source.selected;
        if (filterSource.length) {
            const { system } = item._source as {
                system: { source?: { value: string }; publication?: { title: string } };
            };
            const pubSource = String(
                system.publication?.title ?? system.source?.value ?? ""
            ).trim();
            const sourceSlug = game.pf2e.system.sluggify(pubSource);

            if (!filterSource.includes(sourceSlug)) {
                this.#dropDataWarning("source", "", pubSource);
                return false;
            }
        }

        return true;
    }

    #validateFeat(item: FeatPF2e, filter: FeatFilters) {
        const { checkboxes, level } = filter;

        if (!item.level.between(level.from, level.to)) {
            this.#dropDataWarning("level", `${level.from}-${level.to}`, String(item.level));
            return false;
        }

        const filterCategory = checkboxes.category.selected as FeatOrFeatureCategory[];
        if (filterCategory.length && !filterCategory.includes(item.category)) {
            this.#dropDataWarning(
                "category",
                filterCategory.map((x) => game.i18n.localize(CONFIG.PF2E.featCategories[x])),
                game.i18n.localize(CONFIG.PF2E.featCategories[item.category])
            );
            return false;
        }

        const filterSkills = checkboxes.skills.selected as SkillSlug[];
        if (filterSkills.length) {
            const prereqs: { value: string }[] = item.system.prerequisites.value;
            const prerequisitesArr = prereqs.map((prerequisite) =>
                prerequisite?.value ? prerequisite.value.toLowerCase() : ""
            );
            const translatedSkills = getTranslatedSkills(true);
            const skillList = Object.entries(translatedSkills);
            const skills: Set<SkillSlug> = new Set();

            for (const prereq of prerequisitesArr) {
                for (const [key, value] of skillList) {
                    if (prereq.includes(key) || prereq.includes(value)) {
                        skills.add(key as SkillSlug);
                    }
                }
            }

            const itemSkills = [...skills];
            const missingSkills = R.difference(filterSkills, itemSkills);

            if (missingSkills.length) {
                this.#dropDataWarning(
                    "skills",
                    missingSkills.map((x) => translatedSkills[x])
                );
                return false;
            }
        }

        if (!this.#validateDefault(item, filter)) {
            return false;
        }

        return true;
    }

    #validateSpell(item: SpellPF2e, filter: SpellFilters) {
        const { checkboxes } = filter;

        const itemRank = String(item.rank);
        const filterRanks = checkboxes.rank.selected;
        if (filterRanks.length && !filterRanks.includes(itemRank)) {
            this.#dropDataWarning("rank", filterRanks, itemRank);
            return false;
        }

        const filterCategories = checkboxes.category.selected as SpellTrait[];
        if (filterCategories.length) {
            const isCantrip = item.isCantrip;
            const isFocusSpell = item.isFocusSpell;
            const isRitual = item.isRitual;
            const isSpell = !isCantrip && !isFocusSpell && !isRitual;
            const categories = R.filter(
                [
                    isSpell ? "spell" : null,
                    isCantrip ? "cantrip" : null,
                    isFocusSpell ? "focus" : null,
                    isRitual ? "ritual" : null,
                ] as SpellTrait[],
                R.isTruthy
            );

            const sortedFilterCategories = filterCategories.sort();
            const sortedItemCategories = categories.sort();

            if (!R.isDeepEqual(sortedFilterCategories, sortedItemCategories)) {
                this.#dropDataWarning(
                    "categories",
                    sortedFilterCategories.map((x) =>
                        game.i18n.localize(CONFIG.PF2E.spellTraits[x])
                    ),
                    sortedItemCategories.map((x) =>
                        game.i18n.localize(CONFIG.PF2E.spellTraits[x] ?? "TYPES.Item.spell")
                    )
                );
                return false;
            }
        }

        const filterTraditions = checkboxes.traditions.selected as MagicTradition[];
        const itemTraditions = item.system.traits.traditions as MagicTradition[];
        if (filterTraditions.length && !R.intersection(filterTraditions, itemTraditions).length) {
            this.#dropDataWarning(
                "traditions",
                filterTraditions.map((x) => game.i18n.localize(CONFIG.PF2E.magicTraditions[x])),
                itemTraditions.map((x) => game.i18n.localize(CONFIG.PF2E.magicTraditions[x]))
            );
            return false;
        }

        if (!this.#validateDefault(item, filter)) {
            return false;
        }

        return true;
    }

    async #compendiumFilterFromElement(el: HTMLElement) {
        try {
            const data = elementDataset<RowElementDataset>(el);
            const dailyRow = this.#getDailyRow<DailyRowDrop>(data.daily, data.row);
            const filterKey = `${data.daily}.${data.row}`;

            this.#dropFilters[filterKey] ??= await (async () => {
                const filter = foundry.utils.deepClone(dailyRow.filter);
                return {
                    daily: data.daily,
                    row: data.row,
                    type: filter.type,
                    filter: await this.#convertToCompendiumFilter(filter),
                };
            })();

            return foundry.utils.deepClone(this.#dropFilters[filterKey]);
        } catch (err) {
            error("error.unexpected");
            console.error(err);
            console.error(`The error occured when trying to open a drop filter.`);
        }
    }

    #getDailyRow<T extends DailyRow>(daily: string, row: string) {
        return this.#dailies[daily]?.prepared.rows[row] as T;
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
}

function rowElementIsOFType<T extends DailyRowType>(
    el: HTMLSelectElement | HTMLInputElement,
    ...types: T[]
): el is RowElementTypes[T] {
    return types.some((type) => el.dataset.type === type);
}

type DailyTemplate = {
    label: string;
    rows: RowTemplate[];
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

type RowElementDatasetBase = {
    daily: string;
    row: string;
    save: `${boolean}`;
};

type RowElementTypes = {
    select: HTMLSelectElement & { dataset: RowElementDatasetBase };
    random: HTMLSelectElement & { dataset: RowElementDatasetBase };
    combo: HTMLInputElement & { dataset: RowElementDatasetBase & { input: StringBoolean } };
    alert: HTMLInputElement & { dataset: RowElementDatasetBase };
    input: HTMLInputElement & { dataset: RowElementDatasetBase };
    notify: HTMLInputElement & { dataset: RowElementDatasetBase };
    drop: HTMLInputElement & { dataset: RowElementDatasetBase & { uuid: string } };
};

type RowElementDataset = RowElementDatasetBase & {
    type: DailyRowType;
    dailykey: string;
    droptype: DailyRowDropType;
    unique: string;
    input: StringBoolean;
    uuid: string;
    empty: StringBoolean;
};

export { DailyInterface };
