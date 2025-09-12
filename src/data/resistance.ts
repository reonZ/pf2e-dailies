import { createDaily } from "daily";
import { ResistanceType, sortByLocaleCompare } from "module-helpers";
import { SimplifiableRuleValue, utils } from "utils";

function createResistanceDaily(
    key: string,
    uuid: string,
    resistances: ResistanceType[],
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

            sortByLocaleCompare(options, "label");

            return [
                {
                    type: isRandom ? "random" : "select",
                    slug: "resistance",
                    options,
                },
            ];
        },
        process: ({ rows, items, messages, addRule }) => {
            const type = rows.resistance as ResistanceType;
            const source = utils.createResistanceRuleElement({
                type,
                value: resistance,
            });

            addRule(items.item, source);
            messages.add("resistances", {
                uuid: items.item,
                selected: utils.getResistanceLabel(type),
                random: isRandom,
            });
        },
    });
}

export { createResistanceDaily };
