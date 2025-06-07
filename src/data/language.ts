import { createDaily } from "daily";
import { Language } from "module-helpers";
import { utils } from "utils";

function createLanguageDaily(key: string, uuid: string) {
    return createDaily({
        key,
        items: [
            {
                slug: "item",
                uuid,
                required: true,
            },
        ],
        label: (actor, items) => items.item.name,
        rows: (actor) => {
            const languageList = utils.getLanguages();
            const actorLanguages = actor.system.details.languages.value;
            const options = languageList.filter(({ value }) => !actorLanguages.includes(value));

            return [
                {
                    type: "select",
                    slug: "language",
                    options,
                },
            ];
        },
        process: ({ rows, items, messages, addRule }) => {
            const language = rows.language as Language;
            const source = utils.createLanguageRuleElement({ language });

            addRule(items.item, source);
            messages.add("languages", { uuid, selected: utils.getLanguageLabel(language) });
        },
    });
}

export { createLanguageDaily };
