import { ConsumablePF2e, localize } from "module-helpers";
import { createDaily } from "../daily";
import { utils } from "../utils";

const rationsUUID = "Compendium.pf2e.equipment-srd.Item.L9ZV076913otGtiB";

const rations = createDaily({
    key: "rations",
    items: [
        {
            slug: "rations",
            uuid: rationsUUID, // Rations
            required: true,
        },
    ],
    label: (actor, items) => items.rations.name,
    rows: (actor, items) => {
        const rations = items.rations as ConsumablePF2e;
        const { value, max } = rations.uses;
        const remaining = (rations.quantity - 1) * max + value;
        const last = remaining <= 1;

        return [
            {
                slug: "rations",
                type: "select",
                order: 200,
                save: false,
                options: [
                    {
                        value: "false",
                        label: localize("interface.rations.no"),
                    },
                    {
                        value: "true",
                        label: last
                            ? localize("interface.rations.last")
                            : localize("interface.rations.yes", { nb: remaining }),
                    },
                ],
            },
        ];
    },
    process: ({ rows, items, messages, updateItem, deleteItem }) => {
        if (rows.rations !== "true") return;

        const rations = items.rations as ConsumablePF2e;
        let { value, max } = rations.uses;
        let quantity = rations.quantity;

        if (value > 1) {
            updateItem({
                _id: rations.id,
                "system.uses.value": --value,
            });
        } else if (quantity > 1) {
            updateItem({
                _id: rations.id,
                "system.quantity": --quantity,
                "system.uses.value": (value = max),
            });
        } else {
            deleteItem(rations);
            quantity = 0;
            value = 0;
        }

        const remaining = (quantity - 1) * max + value;
        const name = utils.createChatLink(rationsUUID, rations.name);
        const message =
            remaining < 1
                ? localize("message.rations.last", { name })
                : remaining < 3
                ? localize("message.rations.almost", { name, nb: remaining })
                : localize("message.rations.used", { name, nb: remaining });

        messages.addRaw(message, 200);
    },
});

export { rations };
