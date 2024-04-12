import {
    addListener,
    addListenerAll,
    closest,
    getSetting,
    htmlElement,
    querySelector,
    setSetting,
    subLocalize,
    templatePath,
} from "pf2e-api";
import { DAILY_SCHEMA, parseCustomDaily } from "../dailies";
import type { CustomDaily } from "../types";

const localize = subLocalize("customs");

const tabKey = "    ";

const keymap: Record<string, string> = {
    "(": "()",
    "{": "{}",
    "[": "[]",
    "'": "''",
    '"': '"',
    "`": "``",
};

function generateDefaultCode(key: string) {
    return `return {
    key: "${key}",
    items: [],
    label: "",
    rows: (actor, items) => {
        return []
    },
    process: ({actor, rows, messages}) => {

    }
}`;
}

class CustomDailies extends FormApplication {
    #selected: string | null = null;

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "pf2e-dailies-customs",
            title: localize("title"),
            template: templatePath("customs"),
            submitOnChange: false,
            submitOnClose: false,
            closeOnSubmit: false,
            scrollY: [".left .list"],
        });
    }

    get dailies() {
        return getSetting<CustomDaily[]>("customDailies");
    }

    getData(options?: object | undefined) {
        const selected = this.#selected;
        const dailies = this.dailies;
        const daily = dailies.find(({ key }) => key === selected);

        return {
            i18n: localize.i18n,
            list: dailies.map(({ key, schema }) => ({
                key,
                readonly: isNewerVersion(DAILY_SCHEMA, schema ?? ""),
                selected: key === selected,
            })),
            code: daily?.code ?? "",
            readonly: (daily && isNewerVersion(DAILY_SCHEMA, daily?.schema ?? "")) || false,
            disabled: !daily,
        };
    }

    activateListeners($html: JQuery<HTMLElement>) {
        const html = htmlElement($html);

        addListener(html, ".editor", "keydown", this.#onEditorKeyup.bind(this));
        addListener(html, "[data-action='create-daily']", this.#onCreateDaily.bind(this));
        addListener(html, "[data-action='save-daily']", this.#onSaveDaily.bind(this));
        addListener(html, ".right .readonly a", this.#onUnlockDaily.bind(this));

        addListenerAll(html, "[data-action='select-daily']", this.#onSelectDaily.bind(this));
        addListenerAll(html, "[data-action='delete-daily']", this.#onDeleteDaily.bind(this));
    }

    _updateObject(event: SubmitEvent, formData: Record<string, unknown>): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async #onSaveDaily() {
        if (!this.#selected) return;

        const html = htmlElement(this.element);
        const code = querySelector<HTMLTextAreaElement>(html, ".editor").value;
        const daily = await parseCustomDaily({ code, key: this.#selected });

        if (!daily) {
            localize.error("code.error");
            return;
        }

        const dailies = this.dailies.slice();
        const dailyIndex = dailies.findIndex((daily) => daily.key === this.#selected);

        const custom = {
            key: daily.key,
            code,
            schema: DAILY_SCHEMA,
        };

        if (dailyIndex !== -1) {
            dailies.splice(dailyIndex, 1, custom);
        } else {
            dailies.push(custom);
        }

        await setSetting("customDailies", dailies);

        localize.info("code.saved");

        this.#selected = daily.key;
        this.render();
    }

    #onUnlockDaily() {
        const html = htmlElement(this.element);
        const readonlyEl = html.querySelector<HTMLElement>(".right .readonly");
        if (!readonlyEl) return;

        readonlyEl.remove();
        querySelector<HTMLTextAreaElement>(html, ".editor").disabled = false;
        querySelector<HTMLButtonElement>(html, "[data-action='save-daily']").disabled = false;
    }

    #onEditorKeyup(event: KeyboardEvent, editor: HTMLTextAreaElement) {
        const pos = editor.selectionStart;

        if (event.key === "Tab") {
            event.preventDefault();

            editor.value =
                editor.value.slice(0, pos) + tabKey + editor.value.slice(editor.selectionEnd);

            editor.selectionStart = pos + tabKey.length;
            editor.selectionEnd = pos + tabKey.length;
        } else if (keymap[event.key]) {
            event.preventDefault();

            editor.value =
                editor.value.slice(0, pos) +
                keymap[event.key] +
                editor.value.slice(editor.selectionEnd);

            editor.selectionStart = pos + 1;
            editor.selectionEnd = pos + 1;
        }
    }

    #onSelectDaily(event: MouseEvent, el: HTMLElement) {
        const key = closest(el, ".row").dataset.key!;
        this.#selected = key;
        this.render();
    }

    async #onCreateDaily() {
        const key = randomID();
        const dailies = this.dailies.slice();

        dailies.push({
            key,
            code: generateDefaultCode(key),
            schema: DAILY_SCHEMA,
        });

        await setSetting("customDailies", dailies);

        this.#selected = key;
        this.render();
    }

    async #onDeleteDaily(event: MouseEvent, el: HTMLElement) {
        const key = closest(el, ".row").dataset.key!;
        const dailies = this.dailies.slice();
        const index = dailies.findIndex((daily) => daily.key === key);
        if (index === -1) return false;

        const accept = await Dialog.confirm({
            title: localize("delete.title"),
            content: localize("delete.content"),
        });

        if (!accept) return;

        dailies.splice(index, 1);

        await setSetting("customDailies", dailies);

        this.#selected = null;
        this.render();
    }
}

export { CustomDailies };
