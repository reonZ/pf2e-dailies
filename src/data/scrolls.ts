import { OneToSix, R } from "module-helpers";
import { createDaily } from "../daily";
import { DailyRowDropSpell } from "../types";
import { utils } from "../utils";

type OneToSeven = OneToSix | 7;

function createScrollChainDaily(key: string, uuids: [string, string, string]) {
    return createDaily({
        key,
        items: [
            {
                slug: "trained",
                uuid: uuids[0],
                required: true,
            },
            {
                slug: "expert",
                uuid: uuids[1],
            },
            {
                slug: "master",
                uuid: uuids[2],
            },
        ],
        label: (actor, items) => items.trained.name,
        rows: (actor, items) => {
            const level = actor.level;
            const ranks: OneToSeven[] = [1];

            if (level >= 8) ranks.push(2);

            if (items.expert) {
                ranks.push(3);
                if (level >= 14) ranks.push(4);
                if (level >= 16) ranks.push(5);
            }

            if (items.master) {
                ranks.push(6);
                if (level >= 20) ranks.push(7);
            }

            return ranks.map(
                (rank): DailyRowDropSpell => ({
                    type: "drop",
                    slug: `rank${rank}`,
                    label: utils.getSpellRankLabel(rank),
                    filter: {
                        type: "spell",
                        search: {
                            category: ["spell"],
                            rank,
                            rarity: ["common"],
                        },
                    },
                })
            );
        },
        process: async ({ rows, messages, addItem }) => {
            for (const rank of R.range(1, 8) as OneToSeven[]) {
                const { uuid } = rows[`rank${rank}`] ?? {};
                if (!uuid) continue;

                const label = utils.getSpellWithRankLabel(uuid, rank);
                const source = await utils.createSpellScrollSource({
                    uuid,
                    level: rank,
                });

                addItem(source);
                messages.add("scrolls", { uuid, label });
            }
        },
    });
}

export { createScrollChainDaily };
