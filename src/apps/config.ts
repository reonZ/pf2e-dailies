import {
    R,
    addListener,
    addListenerAll,
    createHTMLElement,
    elementDataset,
    localize,
    render,
    setFlag,
    templateLocalize,
    unsetFlag,
} from "foundry-pf2e";
import { getDisabledDailies } from "../api";
import { getFamiliarAbilityCount } from "../data/familiar";
import type { PreparedDaily } from "../types";

const ApplicationV2 = foundry.applications.api.ApplicationV2;

class DailyConfig extends ApplicationV2 {
    #actor: CharacterPF2e;
    #dailies: PreparedDaily[];

    constructor(
        actor: CharacterPF2e,
        dailies: PreparedDaily[],
        options?: PartialApplicationConfiguration
    ) {
        super(options);
        this.#actor = actor;
        this.#dailies = dailies;
    }

    static emittedEvents = Object.freeze([...ApplicationV2.emittedEvents, "update"]);

    static DEFAULT_OPTIONS: PartialApplicationConfiguration = {
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
        const familiar = actor.familiar
            ? {
                  value: getFamiliarAbilityCount(actor),
                  max: actor.attributes.familiarAbilities.value,
              }
            : undefined;

        const dailies = R.pipe(
            this.#dailies,
            R.map((daily) => ({
                key: daily.key,
                label: daily.label as string,
                enabled: disabled[daily.key] !== true,
            })),
            R.sortBy(R.prop("label"))
        );

        return {
            familiar,
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
        addListenerAll(
            html,
            "[name='daily-enabled']",
            "change",
            this.#onDailyEnabledChange.bind(this)
        );

        addListener(
            html,
            "[name='familiar-range']",
            "change",
            this.#onFamiliarRangeChange.bind(this)
        );
    }

    async #onFamiliarRangeChange(event: Event, el: HTMLInputElement) {
        const actor = this.actor;

        await setFlag(actor, "familiar", {
            value: el.valueAsNumber,
            max: actor.attributes.familiarAbilities.value,
        });

        this.dispatchEvent(new Event("update", { bubbles: true, cancelable: true }));
    }

    async #onDailyEnabledChange(event: Event, el: HTMLInputElement) {
        const { dailyKey } = elementDataset(el);

        if (el.checked) {
            await unsetFlag(this.actor, "disabled", dailyKey);
        } else {
            await setFlag(this.actor, "disabled", dailyKey, true);
        }

        this.dispatchEvent(new Event("update", { bubbles: true, cancelable: true }));
    }
}

type ConfigContext = {
    familiar: Maybe<{
        value: number;
        max: number;
    }>;
    dailies: {
        key: string;
        label: string;
        enabled: boolean;
    }[];
    i18n: ReturnType<typeof templateLocalize>;
};

export { DailyConfig };
