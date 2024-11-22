import { R, getFlag, localeCompare, localize, setFlagProperty } from "module-helpers";
import { isTemporary } from "../api";
import { HomebrewDailies } from "../apps/homebrew";
import { createDaily } from "../daily";
import { DailyMessageOptions } from "../types";
import { AbilitySource, CharacterPF2e, ItemPF2e, ValueAndMax } from "foundry-pf2e";

const SKIP_UNIQUES = ["jevzf9JbJJibpqaI"];

function getFamiliarAbilityCount(actor: CharacterPF2e) {
    const max = actor.attributes.familiarAbilities.value;
    const flag = getFlag<ValueAndMax>(actor, "familiar");

    if (!flag) return max;
    if (flag.max === max) return flag.value;

    const newValue = flag.value - (flag.max - max);
    return Math.clamp(newValue, 0, max);
}

const familiar = createDaily({
    key: "familiar",
    condition: (actor) => !!actor.familiar,
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

        for (const { entry } of HomebrewDailies.getEntries("familiar")) {
            options.push({
                value: entry.uuid,
                label: entry.name,
                skipUnique: false,
            });
        }

        options.sort((a, b) => localeCompare(a.label, b.label));

        return R.range(1, nbAbilities + 1).map((i) => ({
            type: "select",
            slug: `ability${i}`,
            label: localize("label.ability", { nb: i }),
            unique: uniqueId,
            order: 100,
            options: options,
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

                const source = item.toObject();
                setFlagProperty(source, "temporary", true);

                abilities.push(source);
                messageList.push({ uuid: item });
            })
        );

        if (abilities.length) {
            await familiar.createEmbeddedDocuments("Item", abilities);

            for (const message of messageList) {
                messages.add("familiar", message);
            }
        }
    },
    rest: async ({ actor }) => {
        const familiar = actor.familiar;

        if (!familiar) return;

        const ids = familiar.itemTypes.action
            .filter((item) => isTemporary(item))
            .map((item) => item.id);

        if (ids.length) {
            await familiar.deleteEmbeddedDocuments("Item", ids);
        }
    },
});

export { familiar, getFamiliarAbilityCount };
