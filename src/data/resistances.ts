import { ResistanceType } from "foundry-pf2e";
import { createDaily } from "../daily";
import { utils, type SimplifiableRuleValue } from "../utils";

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
                uuid,
                selected: utils.getResistanceLabel(type),
                random: isRandom,
            });
        },
    });
}

export { createResistanceDaily };
