import { createDaily, DailyMessageOptions, DailyRowSelectOption } from "daily";
import { ActorPF2e, getFlag, includesAny, ItemPF2e, localize, R } from "module-helpers";

const COMMANDER_TACTIC_PATH = "extra.dailies.commander-tactics.tactics";

const TACTIC_TRAITS = [
    "commander-expert-tactic",
    "commander-legendary-tactic",
    "commander-master-tactic",
    "commander-mobility-tactic",
    "commander-offensive-tactic",
    "vcommander-master-tactic",
];

const commanderTactics = createDaily({
    key: "commander-tactics",
    items: [
        {
            slug: "tactics", // Tactics
            uuid: "Compendium.pf2e.classfeatures.Item.2IysodKQuf62jmd7",
            required: true,
        },
        {
            slug: "commander", // Commander,
            uuid: "Compendium.pf2e.classes.Item.Oyee5Ds9uwYLEkD0",
        },
        {
            slug: "expert", // Expert Tactician
            uuid: "Compendium.pf2e.classfeatures.Item.ZvsiPWL9mVZk5Tz1",
        },
        {
            slug: "master", // Master Tactician
            uuid: "Compendium.pf2e.classfeatures.Item.wHVfwjs6LJOgDERO",
        },
        {
            slug: "legendary", // Legendary Tactician
            uuid: "Compendium.pf2e.classfeatures.Item.jMxFu2vsw9ZOw61O",
        },
        {
            slug: "efficient", // Efficient Preparation
            uuid: "Compendium.pf2e.feats-srd.Item.UvQjCHNAQVhKvTWb",
        },
        {
            slug: "tactical", // Tactical Excellence
            uuid: "Compendium.pf2e.feats-srd.Item.a7sCZ2ehfsLQutvO",
        },
    ],
    label: (actor, items) => items.tactics.name,
    rows: (actor, { commander, efficient, expert, legendary, master, tactical }) => {
        const uniqueId = foundry.utils.randomID();

        const options: DailyRowSelectOption[] = R.pipe(
            actor.itemTypes.action,
            R.filter(isTacticAbility),
            R.map(({ id, name }): DailyRowSelectOption => {
                return { value: id, label: name };
            })
        );

        const baseNbTactics = !commander ? 1 : legendary ? 6 : master ? 5 : expert ? 4 : 3;
        const extraNbTactics = [efficient ? 1 : 0, tactical ? 1 : 0];
        const nbTactics = Math.min(baseNbTactics + R.sum(extraNbTactics), options.length);

        return R.range(1, nbTactics + 1).map((i) => ({
            type: "select",
            slug: `ability${i}`,
            label: localize("label.ability", { nb: i }),
            unique: uniqueId,
            order: 100,
            options,
        }));
    },
    process: ({ actor, messages, rows, setExtraFlags }) => {
        const tactics: string[] = [];
        const messageList: DailyMessageOptions[] = [];

        for (const id of R.values(rows)) {
            const ability = actor.items.get(id);
            if (!ability) continue;

            tactics.push(id);
            messageList.push({ uuid: ability.uuid });
        }

        if (tactics.length) {
            setExtraFlags({ tactics });

            for (const message of messageList) {
                messages.add("tactics", message);
            }
        }
    },
});

function getCommanderTactics(actor: ActorPF2e) {
    return getFlag<string[]>(actor, COMMANDER_TACTIC_PATH) ?? [];
}

function isTacticAbility(item: Maybe<ItemPF2e>): item is ItemPF2e {
    return item instanceof Item && includesAny(item.system.traits.otherTags, TACTIC_TRAITS);
}

export { COMMANDER_TACTIC_PATH, commanderTactics, getCommanderTactics, isTacticAbility };
