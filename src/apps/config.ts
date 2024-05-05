import {
    addListener,
    addListenerAll,
    elementData,
    htmlElement,
    queryInParent,
    setFlag,
    templateLocalize,
    templatePath,
    unsetFlag,
    withEventManager,
    type WithEventManager,
} from "pf2e-api";
import { getDisabledDailies } from "../api";
import { getFamiliarAbilityCount } from "../data/familiar";
import type { PreparedDaily } from "../types";

interface DailyConfig extends WithEventManager {}

@withEventManager
class DailyConfig extends Application {
    #actor: CharacterPF2e;
    #dailies: PreparedDaily[];

    constructor(actor: CharacterPF2e, dailies: PreparedDaily[], options?: ApplicationOptions) {
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
            this.emitEvent("close");
        }

        this.purgeListeners();

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
        const html = htmlElement($html);

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

        this.emitEvent("update");
    }

    #onFamiliarRangeInput(event: Event, el: HTMLInputElement) {
        const valueInput = queryInParent<HTMLInputElement>(el, "[name='familiar-value']");
        valueInput.value = el.value;
    }

    async #onDailyEnabledChange(event: Event, el: HTMLInputElement) {
        const { dailyKey } = elementData(el);

        if (el.checked) {
            await unsetFlag(this.actor, "disabled", dailyKey);
        } else {
            await setFlag(this.actor, "disabled", dailyKey, true);
        }

        this.emitEvent("update");
    }
}

export { DailyConfig };
