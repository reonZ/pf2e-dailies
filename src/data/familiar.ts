import { createDaily, DailyMessageOptions } from "daily";
import { HomebrewsMenu } from "homebrew";
import {
    AbilitySource,
    CharacterPF2e,
    getFlag,
    getItemSource,
    ItemPF2e,
    localize,
    R,
    setFlagProperty,
    sortByLocaleCompare,
    ValueAndMax,
} from "module-helpers";

const SKIP_UNIQUES = [
    "jevzf9JbJJibpqaI", // skilled
    "BXssJhTJjKrfojwG", // fast movement
];

function getFamiliarAbilityCount(actor: CharacterPF2e) {
    const max = actor.attributes.familiarAbilities.value;
    const flag = getFlag<ValueAndMax>(actor, "config.dailies.familiar.familiar-range");

    if (!flag) return max;
    if (flag.max === max) return flag.value;

    const newValue = flag.value - (flag.max - max);
    return Math.clamp(newValue, 0, max);
}

const familiar = createDaily({
    key: "familiar",
    condition: (actor) => !!actor.familiar?.isOwner,
    rows: async (actor) => {
        const nbAbilities = getFamiliarAbilityCount(actor);
        const pack = game.packs.get("pf2e.familiar-abilities");
        if (!nbAbilities || !pack) return [];

        const uniqueId = foundry.utils.randomID();
        const options = pack.index.map(({ _id, uuid, name }) => ({
            value: uuid,
            label: name,
            skipUnique: SKIP_UNIQUES.includes(_id),
        }));

        for (const { entry } of HomebrewsMenu.getEntries("familiar")) {
            options.push({
                value: entry.uuid,
                label: entry.name,
                skipUnique: false,
            });
        }

        sortByLocaleCompare(options, "label");

        return R.range(1, nbAbilities + 1).map((i) => ({
            type: "select",
            slug: `ability${i}`,
            label: localize("label.ability", { nb: i }),
            unique: uniqueId,
            order: 100,
            options,
        }));
    },
    process: async ({ actor, rows, messages }) => {
        const familiar = actor.familiar;
        if (!familiar) return;

        const abilities: AbilitySource[] = [];
        const messageList: DailyMessageOptions[] = [];

        await Promise.all(
            Object.values(rows).map(async (value) => {
                const item = await fromUuid<ItemPF2e>(value);
                if (!item?.isOfType("action")) return;

                const source = getItemSource(item);
                setFlagProperty(source, "temporary", true);

                abilities.push(source);
                messageList.push({ uuid: item });
            })
        );

        if (abilities.length) {
            for (const ability of abilities) {
                await familiar.createEmbeddedDocuments("Item", [ability]);
            }

            for (const message of messageList) {
                messages.add("familiar", message);
            }
        }
    },
    rest: async ({ actor }) => {
        const familiar = actor.familiar;
        if (!familiar?.isOwner) return;

        const ids = familiar.itemTypes.action
            .filter((item) => getFlag(item, "temporary"))
            .map((item) => item.id);

        if (ids.length) {
            await familiar.deleteEmbeddedDocuments("Item", ids);
        }
    },
    config: (actor) => {
        if (!actor.familiar?.isOwner) return;

        return [
            {
                type: "range",
                name: "familiar-range",
                value: getFamiliarAbilityCount(actor),
                max: actor.attributes.familiarAbilities.value,
                dispatchUpdateEvent: true,
                saveMaxValue: true,
            },
        ];
    },
});

export { familiar, getFamiliarAbilityCount };
