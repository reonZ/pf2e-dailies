import { CustomDaily, parseCustomDaily } from "custom";
import { DAILY_SCHEMA } from "dailies";
import {
    addListener,
    addListenerAll,
    ApplicationConfiguration,
    ApplicationRenderOptions,
    confirmDialog,
    getSetting,
    HandlebarsTemplatePart,
    htmlQuery,
    info,
    localize,
    setSetting,
    templateLocalize,
    TemplateLocalize,
} from "module-helpers";
import apps = foundry.applications.api;

class CustomsMenu extends apps.HandlebarsApplicationMixin(apps.ApplicationV2) {
    #selected: string | undefined;

    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        classes: ["category-browser"],
        id: "pf2e-dailies-customs-menu",
        window: {
            positioned: true,
            resizable: true,
            minimizable: true,
            frame: true,
        },
        position: {
            width: 900,
            height: 700,
        },
    };

    static PARTS: Record<CustomsMenuPart, HandlebarsTemplatePart> = {
        sidebar: {
            template: "modules/pf2e-dailies/templates/customs/sidebar.hbs",
            scrollable: ["nav"],
        },
        main: {
            template: "modules/pf2e-dailies/templates/customs/main.hbs",
            scrollable: [".scrollable"],
        },
    };

    get title(): string {
        return localize("customs.title");
    }

    get dailies(): CustomDaily[] {
        return getSetting<CustomDaily[]>("customDailies");
    }

    get code(): string {
        return htmlQuery<HTMLInputElement>(this.element, "code-mirror")?.value ?? "";
    }

    async _prepareContext(options: ApplicationRenderOptions): Promise<CustomsMenuContext> {
        const selected = this.#selected;
        const dailies = this.dailies;
        const daily = dailies.find(({ key }) => key === selected);
        const readonly = daily && foundry.utils.isNewerVersion(DAILY_SCHEMA, daily?.schema ?? "");

        const list = dailies.map(({ key, schema }) => ({
            key,
            readonly: foundry.utils.isNewerVersion(DAILY_SCHEMA, schema ?? ""),
            selected: key === selected,
        }));

        return {
            code: daily?.code,
            disabled: !daily || readonly,
            i18n: templateLocalize("customs"),
            list,
            readonly,
        };
    }

    _attachPartListeners(
        partId: CustomsMenuPart,
        html: HTMLElement,
        options: apps.HandlebarsRenderOptions
    ) {
        if (partId === "main") {
            this.#attachMainListeners(html);
        } else if (partId === "sidebar") {
            this.#attachSidebarListeners(html);
        }
    }

    #attachMainListeners(html: HTMLElement) {
        type EventAction = "delete-daily" | "save-daily";

        addListenerAll(html, `[data-action]`, (el) => {
            const action = el.dataset.action as EventAction;

            if (action === "delete-daily") {
                this.#deleteDaily();
            } else if (action === "save-daily") {
                this.#saveDaily();
            }
        });

        addListener(html, ".readonly a", this.#onUnlockDaily.bind(this));
    }

    #onUnlockDaily() {
        const html = this.element;
        const readonlyEl = html.querySelector<HTMLElement>(".readonly");

        readonlyEl?.remove();

        const disabled = this.element.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
            "form [disabled]"
        );

        for (const el of disabled) {
            el.disabled = false;
        }
    }

    #attachSidebarListeners(html: HTMLElement) {
        type EventAction = "create-daily" | "select-daily";

        addListenerAll(html, `[data-action]`, (el) => {
            const action = el.dataset.action as EventAction;

            if (action === "create-daily") {
                this.#createDaily();
            } else if (action === "select-daily") {
                this.#selected = el.dataset.tab;
                this.render();
            }
        });
    }

    async #saveDaily() {
        const key = this.#selected;
        if (!key) return;

        const code = this.code;
        const daily = await parseCustomDaily({ code, key });
        if (!daily) return;

        const dailies = this.dailies.slice();
        const custom: CustomDaily = { key: daily.key, code, schema: DAILY_SCHEMA };

        if (!dailies.findSplice((x) => x.key === key, custom)) {
            dailies.push(custom);
        }

        await setSetting(`customDailies`, dailies);

        info("customs.code.saved");

        this.#selected = daily.key;
        this.render();
    }

    async #deleteDaily() {
        const key = this.#selected;
        if (!key) return;

        const accept = await confirmDialog("customs.delete");
        if (!accept) return;

        const dailies = this.dailies.slice();

        if (dailies.findSplice((x) => x.key === key)) {
            await setSetting(`customDailies`, dailies);
            this.render();
        }
    }

    async #createDaily() {
        const key = foundry.utils.randomID();
        const dailies = this.dailies.slice();

        dailies.push({
            key,
            code: defaultTemplate(key),
            schema: DAILY_SCHEMA,
        });

        await setSetting("customDailies", dailies);

        this.#selected = key;
        this.render();
    }
}

function defaultTemplate(key: string) {
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

type CustomsMenuPart = "main" | "sidebar";

type CustomsMenuContext = {
    code: string | undefined;
    disabled: boolean | undefined;
    i18n: TemplateLocalize;
    list: {
        key: string;
        readonly: boolean;
        selected: boolean;
    }[];
    readonly: boolean | undefined;
};

export { CustomsMenu };
