import { createDaily } from "daily";
import { utils } from "utils";

const featUUID = "Compendium.pf2e.feats-srd.Item.22P7IFyhrF7Fbw8B";
const effectUUID = "Compendium.pf2e.feat-effects.Item.jO7wMhnjT7yoAtQg";

const rootMagic = createDaily({
    key: "root-magic",
    items: [
        {
            slug: "root", // Root Magic
            uuid: featUUID,
            required: true,
        },
    ],
    label: (actor, items) => items.root.name,
    rows: (actor) => {
        return [
            {
                type: "select",
                slug: "target",
                options: utils.getActors(actor).map((a) => ({ value: a.id, label: a.name })),
            },
        ];
    },
    process: ({ rows, messages }) => {
        const actor = game.actors.get(rows.target);
        if (actor) {
            messages.add("root", { uuid: effectUUID, selected: actor.name });
        }
    },
});

export { rootMagic };
