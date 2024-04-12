import { createDaily } from "../daily";
import { utils, type SimplifiableRuleValue } from "../utils";

function createResistanceDaily(
    key: string,
    uuid: string,
    resistances: string[],
    resistance: SimplifiableRuleValue,
    isRandom = false
) {
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
        rows: () => {
            const options = resistances.map((value) => ({
                value,
                label: utils.getResistanceLabel(value, true),
            }));

            return [
                {
                    type: isRandom ? "random" : "select",
                    slug: "resistance",
                    options,
                },
            ];
        },
        process: ({ rows, items, messages, addRule }) => {
            const source = utils.createResistanceRuleElement({
                type: rows.resistance,
                value: resistance,
            });

            addRule(items.item, source);
            messages.add("resistances", {
                uuid,
                selected: utils.getResistanceLabel(rows.resistance),
                random: isRandom,
            });
        },
    });
}

export { createResistanceDaily };
