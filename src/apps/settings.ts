import {
    addListenerAll,
    elementData,
    htmlElement,
    setFlag,
    templatePath,
    unsetFlag,
    withEventManager,
    type WithEventManager,
} from "pf2e-api";
import { getDisabledDailies } from "../api";
import type { PreparedDaily } from "../types";

interface DailySettings extends WithEventManager {}

@withEventManager
class DailySettings extends Application {
    #actor: CharacterPF2e;
    #dailies: PreparedDaily[];

    constructor(actor: CharacterPF2e, dailies: PreparedDaily[], options?: ApplicationOptions) {
        super(options);

        this.#actor = actor;
        this.#dailies = dailies;
    }

    get template() {
        return templatePath("settings");
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
        const disabled = getDisabledDailies(this.actor);

        return {
            dailies: this.#dailies.map((daily) => ({
                key: daily.key,
                label: daily.label,
                enabled: disabled[daily.key] !== true,
            })),
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

export { DailySettings };
