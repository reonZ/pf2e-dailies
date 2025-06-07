import {
    addListenerAll,
    ApplicationConfiguration,
    ApplicationRenderOptions,
    getSetting,
    HandlebarsTemplatePart,
    htmlClosest,
    htmlQuery,
    ItemType,
    localize,
    R,
    setSetting,
    templateLocalize,
    TemplateLocalize,
    warning,
} from "module-helpers";
import { utils } from "utils";
import apps = foundry.applications.api;

const INDEX = ["familiar", "animist"] as const;

const INDEX_TYPE: Record<HomebrewIndex, ItemType> = {
    familiar: "action",
    animist: "feat",
};

class HomebrewsMenu extends apps.HandlebarsApplicationMixin(apps.ApplicationV2) {
    #selected: HomebrewIndex | undefined;

    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
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

    static PARTS: Record<HomebrewsMenuPart, HandlebarsTemplatePart> = {
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
        return getSetting<Record<HomebrewIndex, string[]>>("homebrewEntries");
    }

    get title(): string {
        return localize("homebrew.title");
    }

    get selected(): HomebrewIndex | undefined {
        return this.#selected && INDEX.includes(this.#selected) ? this.#selected : undefined;
    }

    static getEntries(index: HomebrewIndex) {
        if (!INDEX.includes(index)) return [];

        return R.pipe(
            HomebrewsMenu.homebrews[index] ?? [],
            R.map((id) => {
                const result = HomebrewsMenu.getEntryData(index, id);
                if (!result) return;

                if (!result.isPack) return [result];

                return R.pipe(
                    result.entry.index.contents,
                    R.filter((entry) => entry.type === INDEX_TYPE[index]),
                    R.map((entry) => ({ isPack: true, entry }))
                );
            }),
            R.flat(),
            R.filter(R.isTruthy)
        );
    }

    static getEntryData(
        index: Maybe<HomebrewIndex>,
        id: string
    ): PackHomebrew | ItemHomebrew | undefined {
        if (!index || !INDEX.includes(index)) return;

        const pack = game.packs.get(id);
        if (pack) {
            return pack.metadata.type === "Item" ? { entry: pack, isPack: true } : undefined;
        }

        const entry = fromUuidSync<CompendiumIndexData>(id);
        return entry?.type === INDEX_TYPE[index] ? { entry, isPack: false } : undefined;
    }

    async _prepareContext(options: ApplicationRenderOptions): Promise<HomebrewsMenuContext> {
        const homebrewsSettings = HomebrewsMenu.homebrews;
        const selected = this.selected;

        const entries = R.pipe(
            (selected && homebrewsSettings[selected]) ?? [],
            R.map((id): HomebrewEntry | undefined => {
                const result = HomebrewsMenu.getEntryData(selected, id);
                if (!result) return;

                const { entry, isPack } = result;
                const [img, name] = isPack
                    ? [null, entry.metadata.label]
                    : [
                          entry.img.trim() || "icons/sundries/books/book-red-exclamation.webp",
                          entry.name,
                      ];

                return { id, img, name, isPack };
            }),
            R.filter(R.isTruthy),
            R.sortBy([R.prop("isPack"), "desc"], R.prop("name"))
        );

        const index: HomebrewsMenuContext["index"] = R.pipe(
            INDEX,
            R.map((id) => {
                return {
                    id,
                    label: localize("homebrew.index", id),
                    selected: selected === id,
                };
            }),
            R.sortBy(R.prop("label"))
        );

        return {
            disabled: !selected,
            entries,
            i18n: templateLocalize("homebrew"),
            index,
        };
    }

    _attachPartListeners(
        partId: HomebrewsMenuPart,
        html: HTMLElement,
        options: apps.HandlebarsRenderOptions
    ) {
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
            const homebrew = HomebrewsMenu.homebrews[index]?.slice() ?? [];

            if (!homebrew.includes(entry)) {
                homebrew.push(entry);
                await setSetting(`homebrewEntries`, { [index]: homebrew });
                this.render();
            } else {
                input.value = "";
            }

            return;
        }

        warning("homebrew", entry ? "invalid" : "empty", { entry, type });
        input.value = "";
    }

    async #deleteHomebrew(id: string) {
        const index = this.selected;
        if (!index) return;

        const homebrew = HomebrewsMenu.homebrews[index]?.slice();

        if (homebrew?.findSplice((entry) => entry === id)) {
            await setSetting(`homebrewEntries`, { [index]: homebrew });
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

type HomebrewsMenuContext = {
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
    isPack: boolean;
};

type HomebrewIndex = (typeof INDEX)[number];

export { HomebrewsMenu };
