import {
    ApplicationConfiguration,
    ApplicationRenderOptions,
    CharacterPF2e,
    R,
    addListenerAll,
    createHTMLElement,
    elementDataset,
    getFlag,
    getInputValue,
    localize,
    render,
    setFlag,
    templateLocalize,
    unsetFlag,
} from "module-helpers";
import { getDisabledDailies } from "../api";
import type { DailyConfigRow, DailyConfigRowValue, PreparedDaily } from "../types";

const ApplicationV2 = foundry.applications.api.ApplicationV2;

class DailyConfig extends ApplicationV2 {
    #actor: CharacterPF2e;
    #dailies: PreparedDaily[];

    constructor(
        actor: CharacterPF2e,
        dailies: PreparedDaily[],
        options?: DeepPartial<ApplicationConfiguration>
    ) {
        super(options);
        this.#actor = actor;
        this.#dailies = dailies;
    }

    static emittedEvents = Object.freeze([...ApplicationV2.emittedEvents, "update"]);

    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        window: {
            positioned: true,
            resizable: true,
            minimizable: true,
            frame: true,
        },
    };

    get title() {
        return localize("config.title", { actor: this.actor.name });
    }

    get actor() {
        return this.#actor;
    }

    async _prepareContext(options: ApplicationRenderOptions): Promise<ConfigContext> {
        const actor = this.actor;
        const disabled = getDisabledDailies(actor);

        const dailies = R.pipe(
            await Promise.all(
                this.#dailies.map(async (daily): Promise<ConfigContextDaily> => {
                    const configs = R.pipe(
                        (R.isFunction(daily.config) && (await daily.config(actor))) || [],
                        R.map((config) => {
                            config.value ??= (() => {
                                const value = getFlag<DailyConfigRowValue>(
                                    actor,
                                    "config",
                                    daily.key,
                                    config.name
                                );

                                return R.isPlainObject(value) ? value.value : value;
                            })();

                            if (config.type === "range") {
                                config.min ??= 0;
                                config.step ??= 1;
                            }

                            return config;
                        })
                    );

                    return {
                        key: daily.key,
                        label: daily.label as string,
                        enabled: disabled[daily.key] !== true,
                        configs: configs?.length ? configs : undefined,
                    };
                })
            ),
            R.sortBy(R.prop("label"))
        );

        return {
            dailies,
            i18n: templateLocalize("config"),
        };
    }

    _renderHTML(context: ConfigContext, options: ApplicationRenderOptions): Promise<string> {
        return render("config", context);
    }

    _replaceHTML(result: string, content: HTMLElement, options: ApplicationRenderOptions) {
        const wrapper = createHTMLElement("div", { innerHTML: result });
        content.replaceChildren(...wrapper.children);
        this.#activateListeners(content);
    }

    _onRender() {
        const familiarInput = this.element.querySelector<HTMLInputElement>(
            ".window-content .familiar [name='familiar-range'] input[type='number']"
        );

        if (familiarInput) {
            familiarInput.disabled = true;
        }
    }

    #activateListeners(html: HTMLElement) {
        const actor = this.actor;

        addListenerAll(html, ".daily [name]", "change", async (event, el: HTMLInputElement) => {
            const { dailyKey } = elementDataset(el);

            if (el.checked) {
                await unsetFlag(this.actor, "disabled", dailyKey);
            } else {
                await setFlag(this.actor, "disabled", dailyKey, true);
            }

            this.dispatchEvent(new Event("update", { bubbles: true, cancelable: true }));
        });

        addListenerAll(html, ".config [name]", "change", async (event, el: HTMLInputElement) => {
            const dailyKey = el.dataset.dailyKey as string;
            const value = getInputValue(el);
            const saveValue =
                el.dataset.saveMaxValue === "true"
                    ? { value, max: Number(el.getAttribute("max")) }
                    : value;

            await setFlag(actor, "config", dailyKey, el.name, saveValue);

            if (el.dataset.dispatchUpdateEvent === "true") {
                this.dispatchEvent(new Event("update", { bubbles: true, cancelable: true }));
            }
        });
    }
}

type ConfigContextDaily = {
    key: string;
    label: string;
    enabled: boolean;
    configs: DailyConfigRow[] | undefined;
};

type ConfigContext = {
    dailies: ConfigContextDaily[];
    i18n: ReturnType<typeof templateLocalize>;
};

export { DailyConfig };
