import {
    addListener,
    addListenerAll,
    elementDataset,
    htmlQuery,
    setFlag,
    templateLocalize,
    templatePath,
    unsetFlag,
} from "foundry-pf2e";
import { getDisabledDailies } from "../api";
import { getFamiliarAbilityCount } from "../data/familiar";
import type { PreparedDaily } from "../types";

// interface DailyConfig extends WithEventManager {}

class DailyConfig extends foundry.utils.EventEmitterMixin<typeof Application, "update" | "close">(
    Application
) {
    #actor: CharacterPF2e;
    #dailies: PreparedDaily[];

    static emittedEvents = ["update", "close"];

    constructor(
        actor: CharacterPF2e,
        dailies: PreparedDaily[],
        options?: Partial<ApplicationOptions>
    ) {
        super(options);

        this.#actor = actor;
        this.#dailies = dailies;
    }

    get template() {
        return templatePath("config");
    }

    get title() {
        return this.actor.name;
    }

    get actor() {
        return this.#actor;
    }

    close(options?: { force?: boolean; noEmit?: boolean }) {
        if (!options?.noEmit) {
            this.dispatchEvent(new Event("close", { bubbles: true, cancelable: true }));
        }
        return super.close(options);
    }

    getData(options?: any) {
        const actor = this.actor;
        const disabled = getDisabledDailies(actor);
        const familiar = actor.familiar
            ? {
                  value: getFamiliarAbilityCount(actor),
                  max: actor.attributes.familiarAbilities.value,
              }
            : undefined;

        return {
            familiar,
            dailies: this.#dailies.map((daily) => ({
                key: daily.key,
                label: daily.label,
                enabled: disabled[daily.key] !== true,
            })),
            i18n: templateLocalize("config"),
        };
    }

    activateListeners($html: JQuery<HTMLElement>): Promisable<void> {
        const html = $html[0];

        addListenerAll(
            html,
            "[name='daily-enabled']",
            "change",
            this.#onDailyEnabledChange.bind(this)
        );

        addListener(
            html,
            "[name='familiar-range']",
            "input",
            this.#onFamiliarRangeInput.bind(this)
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

    #onFamiliarRangeInput(event: Event, el: HTMLInputElement) {
        const valueInput = htmlQuery<HTMLInputElement>(el.parentElement, "[name='familiar-value']");
        if (valueInput) valueInput.value = el.value;
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

export { DailyConfig };
