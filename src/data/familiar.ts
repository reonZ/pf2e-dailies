import { R, getFlag, getSetting, localeCompare, localize, setFlagProperty } from "pf2e-api";
import { isTemporary } from "../api";
import { createDaily } from "../daily";
import { DailyMessageOptions } from "../types";

function getPack(): CompendiumCollection<AbilityItemPF2e> {
    return game.packs.get("pf2e.familiar-abilities")!;
}

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
        if (!nbAbilities) return [];

        const pack = getPack();
        const uniqueId = foundry.utils.randomID();
        const options = pack.index.map(({ _id, name }) => ({
            value: _id,
            label: name,
        }));
        const customUUIDS = getSetting<String>("familiarAbilities").split(",");

        for (let uuid of customUUIDS) {
            uuid = uuid.trim();
            const item = await fromUuid<ItemPF2e>(uuid);

            if (item?.isOfType("action")) {
                options.push({ value: uuid, label: item.name });
            }
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

        const pack = getPack();
        const abilities: AbilitySource[] = [];
        const messageList: DailyMessageOptions[] = [];

        await Promise.all(
            Object.values(rows).map(async (value) => {
                const isCustom = value.includes(".");
                const item = await (isCustom ? fromUuid<ItemPF2e>(value) : pack.getDocument(value));

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
