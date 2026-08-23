import { DailyActorFlags } from "actor";
import { filterDailies, getDailies } from "dailies";
import { processUpdatedItemsData } from "interface";
import {
    ActionDefaultOptions,
    actorItems,
    CharacterPF2e,
    ChatMessagePF2e,
    getFlag,
    MODULE,
    R,
    SYSTEM,
} from "foundry-helpers";
import { createUpdateCollection } from "utils";

async function restForTheNight(
    wrapped: libWrapper.RegisterCallback,
    options: ActionDefaultOptions,
): Promise<ChatMessagePF2e[]> {
    const result = await wrapped(options);

    try {
        if (!result?.length) {
            return result;
        }

        const characters = R.pipe(
            Array.isArray(options.actors) ? options.actors : [options.actors],
            R.filter((actor): actor is CharacterPF2e => !!actor?.isOfType("character")),
        );

        await Promise.all(characters.map(cleanup));
    } catch (error: any) {
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
        }),
    );

    await Promise.all(
        [...actorItems(actor)].map(async (item) => {
            if (getFlag(item, "temporary")) {
                removedItems.push(item.id);

                if (item.isOfType("feat")) {
                    const parentId = getFlag<string>(item, "grantedBy");
                    if (parentId) {
                        const slug = game.pf2e.system.sluggify(item.name, { camel: "dromedary" });
                        updateItem({
                            _id: parentId,
                            [`flags.${SYSTEM.id}.itemGrants.${slug}`]: _del,
                        });
                    }
                }

                return;
            }

            const rules = foundry.utils.deepClone(item._source.system.rules);
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
        }),
    );

    const temporaryDeleted = Object.values(
        getFlag<DailyActorFlags["temporaryDeleted"]>(actor, "temporaryDeleted") ?? {},
    );

    const operations: ModifyBatchOperation[] = [];

    if (temporaryDeleted.length) {
        operations.push({
            action: "create",
            data: temporaryDeleted,
            documentName: "Item",
            keepId: true,
            parent: actor,
        });
    }

    if (updatedItems.size) {
        processUpdatedItemsData(actor, updatedItems);
        operations.push({
            action: "update",
            documentName: "Item",
            updates: updatedItems.contents,
            parent: actor,
        });
    }

    if (removedItems.length) {
        operations.push({
            action: "delete",
            documentName: "Item",
            ids: removedItems,
            parent: actor,
        });
    }

    const flagUpdates = {
        rested: true,
        addedItems: _del,
        flaggedItems: _del,
        extra: _del,
        tooltip: _del,
        temporaryDeleted: _del,
    };

    operations.push({
        action: "update",
        documentName: "Actor",
        updates: [{ _id: actor.id, flags: { [MODULE.id]: flagUpdates } }],
        parent: actor.parent,
    });

    await foundry.documents.modifyBatch(operations);
}

export { restForTheNight };
