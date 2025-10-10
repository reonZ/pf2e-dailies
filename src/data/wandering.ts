import { createDaily, DailyRowDropFeat } from "daily";
import { getItemSourceId, R } from "module-helpers";
import { utils } from "utils";

const ANIMIST_CLASS = "Compendium.pf2e.classes.Item.9KiqZVG9r5g8mC4V";

const wandering = createDaily({
    key: "wandering",
    condition: (actor) => actor.class?.sourceId === ANIMIST_CLASS,
    prepare: (actor) => {
        const feats = R.pipe(
            actor.itemTypes.feat,
            R.filter((feat) => feat.traits.has("wandering")),
            R.map((feat) => {
                const level = feat.system.level.taken ?? feat.system.level.value;
                return [level, feat] as const;
            })
        );

        return { feats };
    },
    rows: (actor, items, custom) => {
        return R.pipe(
            custom.feats,
            R.sortBy(([level]) => level),
            R.map(([level, feat]) => {
                return {
                    type: "drop",
                    slug: `feat-${level}`,
                    label: `PF2E.Level${level}`,
                    filter: {
                        type: "feat",
                        search: {
                            category: ["class"],
                            traits: { selected: ["animist", "wandering"], conjunction: "and" },
                            level: level,
                        },
                    },
                    order: level,
                    save: false,
                    value: {
                        name: feat.name,
                        uuid: getItemSourceId(feat),
                    },
                } satisfies DailyRowDropFeat;
            })
        );
    },
    process: async ({ actor, custom: { feats }, messages, rows, replaceFeat }) => {
        const changed: string[] = [];

        for (const [level, feat] of feats) {
            const row = rows[`feat-${level}`];
            const uuid = utils.getSourceId(feat);

            if (row && row.uuid !== uuid) {
                const source = await utils.getItemSource(row.uuid, "feat");
                if (!source) continue;

                replaceFeat(feat, source);
                changed.push(row.uuid);
            }
        }

        if (changed.length) {
            messages.addGroup("wandering");

            for (const uuid of changed) {
                messages.add("wandering", { uuid });
            }
        }
    },
});

export { wandering };
