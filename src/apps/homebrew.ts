import {
    addListenerAll,
    getSetting,
    htmlClosest,
    htmlQuery,
    R,
    setSetting,
    subLocalize,
    templatePath,
} from "foundry-pf2e";

const localize = subLocalize("homebrew");

const INDEX = ["familiar", "animist"] as const;

const INDEX_VALIDATION: Record<HomebrewIndex, (entry: { type: string }) => boolean> = {
    familiar: (entry) => entry.type === "action",
    animist: (entry) => entry.type === "feat",
} as const;

class HomebrewDailies extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "pf2e-dailies-homebrew",
            title: localize("title"),
            template: templatePath("homebrew"),
            width: 600,
            height: 600,
            submitOnChange: false,
            submitOnClose: false,
            closeOnSubmit: false,
            scrollY: [".entries"],
            tabs: [
                {
                    navSelector: ".tabs",
                    contentSelector: "form .scrollable",
                },
            ],
        });
    }

    static get homebrews() {
        return getSetting<Record<HomebrewIndex, string[]>>("homebrewEntries");
    }

    static getEntries(index: HomebrewIndex) {
        if (!INDEX.includes(index)) return [];

        return R.pipe(
            HomebrewDailies.homebrews[index] ?? [],
            R.map((id) => {
                const result = HomebrewDailies.getEntry(index, id);
                if (!result) return;

                if (!result.isPack) return [result];

                return R.pipe(
                    result.entry.index.contents,
                    R.filter((entry) => INDEX_VALIDATION[index](entry)),
                    R.map((entry) => ({ isPack: true, entry }))
                );
            }),
            R.flat(),
            R.filter(R.isTruthy)
        );
    }

    static getEntry(index: HomebrewIndex, id: string): PackHomebrew | ItemHomebrew | undefined {
        if (!INDEX.includes(index)) return;

        const pack = game.packs.get(id);
        if (pack) {
            return pack.metadata.type === "Item" ? { entry: pack, isPack: true } : undefined;
        }

        const entry = fromUuidSync<CompendiumIndexData>(id);
        return entry && INDEX_VALIDATION[index](entry) ? { entry, isPack: false } : undefined;
    }

    static isValidEntry(index: HomebrewIndex, id: Maybe<string>): id is string {
        return !!id && !!this.getEntry(index, id);
    }

    getData(options?: Partial<FormApplicationOptions>): HomebrewData {
        const homebrewsSettings = HomebrewDailies.homebrews;
        const homebrews = INDEX.map((index) => {
            const entries = R.pipe(
                homebrewsSettings[index] ?? [],
                R.map((id): Homebrew["entries"][number] | undefined => {
                    const result = HomebrewDailies.getEntry(index, id);
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

            return {
                index,
                entries,
            };
        });

        const index = R.pipe(
            INDEX,
            R.map((id) => {
                return {
                    id,
                    label: localize("index", id),
                };
            }),
            R.sortBy(R.prop("label"))
        );

        return {
            index,
            i18n: localize.i18n,
            homebrews,
        };
    }

    activateListeners($html: JQuery<HTMLElement>) {
        const html = this.element[0];

        const getDataFromElement = (el: HTMLElement) => {
            return {
                index: htmlClosest(el, "[data-tab]")?.dataset.tab as HomebrewIndex | undefined,
                id: htmlClosest(el, "[data-id]")?.dataset.id,
            };
        };

        addListenerAll(html, "[data-action]", async (event, el) => {
            const action = el.dataset.action as EventAction;

            switch (action) {
                case "add-homebrew": {
                    const index = this._tabs[0].active as HomebrewIndex;
                    const id = htmlQuery<HTMLInputElement>(html, "[name='entry']")?.value.trim();

                    if (HomebrewDailies.isValidEntry(index, id)) {
                        const homebrews = foundry.utils.deepClone(HomebrewDailies.homebrews);
                        const homebrew = (homebrews[index] ??= []);

                        if (!homebrew.includes(id)) {
                            homebrew.push(id);
                            await setSetting("homebrewEntries", homebrews);
                        }
                    } else if (id) {
                        localize.warn("invalid", { entry: id });
                    } else {
                        localize.warn("empty");
                    }

                    this.render();

                    break;
                }

                case "open-entry": {
                    const { id, index } = getDataFromElement(el);
                    const result = index && id ? HomebrewDailies.getEntry(index, id) : undefined;
                    if (!result) return;

                    if (result.isPack) {
                        result.entry.render(true);
                    } else {
                        const entry = await fromUuid(result.entry.uuid);
                        entry?.sheet.render(true);
                    }

                    break;
                }

                case "delete-entry": {
                    const { id, index } = getDataFromElement(el);
                    if (!id || !index) return;

                    const homebrews = foundry.utils.deepClone(HomebrewDailies.homebrews);
                    const homebrew = homebrews[index];
                    if (!homebrew) return;

                    const entryIndex = homebrew.indexOf(id);
                    if (entryIndex === -1) return;

                    homebrew.splice(entryIndex, 1);

                    await setSetting("homebrewEntries", homebrews);
                    this.render();

                    break;
                }
            }
        });
    }

    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<unknown> {
        throw new Error("Method not implemented.");
    }
}

type EventAction = "add-homebrew" | "open-entry" | "delete-entry";

type HomebrewIndex = (typeof INDEX)[number];

type PackHomebrew = {
    isPack: true;
    entry: CompendiumCollection<
        | ActorPF2e<null>
        | ItemPF2e<null>
        | MacroPF2e
        | ScenePF2e
        | JournalEntry
        | Playlist
        | RollTable
    >;
};

type ItemHomebrew = {
    isPack: false;
    entry: CompendiumIndexData;
};

type ItemHomebrewPromise = Promise<{
    isPack: false;
    entry: ItemPF2e<null>;
}>;

type HomebrewEntry<T extends ItemPF2e<null> = ItemPF2e<null>> = {
    isPack: boolean;
    entry: T;
};

type Homebrew = {
    index: HomebrewIndex;
    entries: { id: string; img: string | null; name: string; isPack: boolean }[];
};

type HomebrewData = {
    index: { id: HomebrewIndex; label: string }[];
    i18n: typeof localize.i18n;
    homebrews: Homebrew[];
};

export { HomebrewDailies };
