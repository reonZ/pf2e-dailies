import {
    addListenerAll,
    CompendiumCollection,
    CompendiumIndexData,
    getSetting,
    htmlClosest,
    htmlQuery,
    ItemType,
    localize,
    R,
    setSetting,
    TemplateLocalize,
} from "foundry-helpers";
import { utils } from "utils";
import apps = foundry.applications.api;

const INDEX = ["familiar", "animist"] as const;

const INDEX_TYPE: Record<HomebrewIndex, ItemType> = {
    familiar: "action",
    animist: "feat",
};

class HomebrewsMenu extends apps.HandlebarsApplicationMixin(apps.ApplicationV2) {
    static #moduleEntries: HomebrewEntries = R.fromKeys(INDEX, () => []);

    #selected: HomebrewIndex | undefined;

    static DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        classes: ["category-browser"],
        id: "pf2e-dailies-homebrews-menu",
        window: {
            positioned: true,
            resizable: true,
            minimizable: true,
            frame: true,
        },
        position: {
            width: 700,
            height: 600,
        },
    };

    static PARTS: Record<HomebrewsMenuPart, fa.api.HandlebarsTemplatePart> = {
        sidebar: {
            template: "modules/pf2e-dailies/templates/homebrew/sidebar.hbs",
            scrollable: ["nav"],
        },
        main: {
            template: "modules/pf2e-dailies/templates/homebrew/main.hbs",
            scrollable: [".scrollable"],
        },
    };

    static get homebrews() {
        return getSetting<Partial<HomebrewEntries>>("homebrewEntries");
    }

    get title(): string {
        return localize("homebrew.title");
    }

    get selected(): HomebrewIndex | undefined {
        return this.#selected && INDEX.includes(this.#selected) ? this.#selected : undefined;
    }

    static registerEntries(entries: unknown) {
        if (!R.isPlainObject(entries)) return;

        for (const [index, ids] of R.entries(entries)) {
            if (!R.isIncludedIn(index, INDEX) || !R.isArray(ids)) continue;

            this.#moduleEntries[index].push(
                ...ids.filter((id): id is string => R.isString(id) && !!this.getEntryData(index, id)),
            );
        }
    }

    static getEntries(index: HomebrewIndex): { isPack: boolean; entry: CompendiumIndexData }[] {
        if (!INDEX.includes(index)) return [];

        return R.pipe(
            this.homebrews[index] ?? [],
            R.concat(this.#moduleEntries[index]),
            R.unique(),
            R.map((id) => {
                const result = this.getEntryData(index, id);
                if (!result) return;

                if (!result.isPack) return [result];

                return R.pipe(
                    result.entry.index.contents,
                    R.filter((entry) => entry.type === INDEX_TYPE[index]),
                    R.map((entry) => ({ isPack: true, entry })),
                );
            }),
            R.flat(),
            R.filter(R.isTruthy),
        );
    }

    static getEntryData(index: Maybe<HomebrewIndex>, id: string): PackHomebrew | ItemHomebrew | undefined {
        if (!index || !INDEX.includes(index)) return;

        const pack = game.packs.get(id);
        if (pack) {
            return pack.metadata.type === "Item" ? { entry: pack, isPack: true } : undefined;
        }

        const entry = fromUuidSync<CompendiumIndexData>(id, { strict: false });
        return entry?.type === INDEX_TYPE[index] ? { entry, isPack: false } : undefined;
    }

    static prepareEntries(index: HomebrewIndex | undefined): HomebrewEntry[] {
        if (!index || !INDEX.includes(index)) return [];

        return R.pipe(
            [
                [this.homebrews[index] ?? [], false],
                [this.#moduleEntries[index], true],
            ] as const,
            R.flatMap(([entries, isModule]) => {
                return entries.map((id): HomebrewEntry | undefined => {
                    const result = this.getEntryData(index, id);
                    if (!result) return;

                    const { entry, isPack } = result;
                    const [img, name] = isPack
                        ? [null, entry.metadata.label]
                        : [entry.img.trim() || "icons/sundries/books/book-red-exclamation.webp", entry.name];

                    return { id, img, name, isModule, isPack };
                });
            }),
            R.filter(R.isTruthy),
            R.uniqueBy(R.prop("id")),
            R.sortBy([R.prop("isPack"), "desc"], R.prop("name")),
        );
    }

    async _prepareContext(_options: fa.ApplicationRenderOptions): Promise<HomebrewsMenuContext> {
        const selected = this.selected;
        const index: HomebrewsMenuContext["index"] = R.pipe(
            INDEX,
            R.map((id) => {
                return {
                    id,
                    label: localize("homebrew.index", id),
                    selected: selected === id,
                };
            }),
            R.sortBy(R.prop("label")),
        );

        return {
            disabled: !selected,
            entries: HomebrewsMenu.prepareEntries(selected),
            i18n: localize.i18n("homebrew"),
            index,
        };
    }

    _attachPartListeners(partId: HomebrewsMenuPart, html: HTMLElement, _options: apps.HandlebarsRenderOptions) {
        if (partId === "main") {
            this.#attachMainListeners(html);
        } else if (partId === "sidebar") {
            this.#attachSidebarListeners(html);
        }
    }

    async #addHomebrew(html: HTMLElement) {
        const index = this.selected;
        const input = htmlQuery<HTMLInputElement>(html, "[name='entry']");
        if (!index || !input) return;

        const entry = input.value.trim();
        const type = utils.getItemTypeLabel(INDEX_TYPE[index]);

        if (entry && HomebrewsMenu.getEntryData(index, entry)) {
            const homebrews = HomebrewsMenu.homebrews;
            const homebrew = (homebrews[index] ??= []);

            if (!homebrew.includes(entry)) {
                homebrew.push(entry);
                await setSetting(`homebrewEntries`, homebrews);
                this.render();
            } else {
                input.value = "";
            }

            return;
        }

        localize.warning("homebrew", entry ? "invalid" : "empty", { entry, type });
        input.value = "";
    }

    async #deleteHomebrew(id: string) {
        const index = this.selected;
        if (!index) return;

        const homebrews = HomebrewsMenu.homebrews;
        const homebrew = homebrews[index];

        if (homebrew?.findSplice((entry) => entry === id)) {
            await setSetting(`homebrewEntries`, homebrews);
            this.render();
        }
    }

    async #openHomebrew(id: string) {
        const data = HomebrewsMenu.getEntryData(this.selected, id);

        if (data?.isPack) {
            data.entry.render(true);
        } else if (data) {
            const entry = await fromUuid(data.entry.uuid);
            entry?.sheet.render(true);
        }
    }

    #attachMainListeners(html: HTMLElement) {
        type EventAction = "add-homebrew" | "open-entry" | "delete-entry";

        const getHomebrewId = (el: HTMLElement): string => {
            return htmlClosest(el, "[data-id]")?.dataset.id ?? "";
        };

        addListenerAll(html, "[data-action]", async (el) => {
            const action = el.dataset.action as EventAction;

            if (action === "add-homebrew") {
                this.#addHomebrew(html);
            } else if (action === "delete-entry") {
                this.#deleteHomebrew(getHomebrewId(el));
            } else if (action === "open-entry") {
                this.#openHomebrew(getHomebrewId(el));
            }
        });
    }

    #attachSidebarListeners(html: HTMLElement) {
        addListenerAll(html, `[data-tab]`, (el) => {
            this.#selected = el.dataset.tab as HomebrewIndex;
            this.render();
        });
    }
}

type PackHomebrew = {
    isPack: true;
    entry: CompendiumCollection;
};

type ItemHomebrew = {
    isPack: false;
    entry: CompendiumIndexData;
};

type HomebrewsMenuPart = "sidebar" | "main";

type HomebrewsMenuContext = fa.ApplicationRenderContext & {
    disabled: boolean;
    entries: HomebrewEntry[];
    i18n: TemplateLocalize;
    index: {
        id: HomebrewIndex;
        label: string;
        selected: boolean;
    }[];
};

type HomebrewEntry = {
    id: string;
    img: string | null;
    name: string;
    isModule: boolean;
    isPack: boolean;
};

type HomebrewIndex = (typeof INDEX)[number];

type HomebrewEntries = Record<HomebrewIndex, string[]>;

export { HomebrewsMenu };
