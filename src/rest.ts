import { MODULE, getFlag, updateFlag, type libWrapper } from "pf2e-api";
import { createUpdateCollection, isTemporary } from "./api";
import { filterDailies, getDailies } from "./dailies";
import { DailyActorFlags } from "./types";

interface RestForTheNightOptions extends ActionDefaultOptions {
    skipDialog?: boolean;
}

async function restForTheNight(
    wrapped: libWrapper.RegisterCallback,
    options: RestForTheNightOptions
) {
    const result = await wrapped(options);

    try {
        if (!result?.length) {
            return result;
        }

        const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
        const characters = actors.filter(
            (actor): actor is CharacterPF2e => !!actor?.isOfType("character")
        );

        await Promise.all(characters.map(cleanup));
    } catch (error) {
        MODULE.error("game.pf2e.actions.restForTheNight", error);
    }

    return result;
}

async function cleanup(actor: CharacterPF2e) {
    const removedItems: string[] = [];
    const [updatedItems, updateItem] = createUpdateCollection();
    const dailies = filterDailies(await getDailies(actor));

    await Promise.all(
        dailies.map((daily) => {
            return daily.rest?.({
                actor,
                updateItem,
                removeItem: (id) => {
                    removedItems.push(id);
                },
            });
        })
    );

    await Promise.all(
        actor.items.map(async (item) => {
            if (isTemporary(item)) {
                removedItems.push(item.id);

                if (item.isOfType("feat")) {
                    const parentId = getFlag<string>(item, "grantedBy");
                    if (parentId) {
                        const slug = game.pf2e.system.sluggify(item.name, { camel: "dromedary" });
                        updateItem({
                            _id: parentId,
                            [`flags.pf2e.itemGrants.-=${slug}`]: true,
                        });
                    }
                }

                return;
            }

            const rules = deepClone(item._source.system.rules);
            let modifiedRules = false;

            for (let i = rules.length - 1; i >= 0; i--) {
                if (MODULE.id in rules[i]) {
                    rules.splice(i, 1);
                    modifiedRules = true;
                }
            }

            if (modifiedRules) {
                updateItem({
                    _id: item.id,
                    "system.rules": rules,
                });
            }
        })
    );

    if (updatedItems.size) {
        await actor.updateEmbeddedDocuments("Item", updatedItems.contents);
    }

    if (removedItems.length) {
        await actor.deleteEmbeddedDocuments("Item", removedItems);
    }

    await updateFlag<DailyActorFlags>(actor, {
        rested: true,
        addedItems: [],
        "-=extra": true,
    });
}

export { restForTheNight };
