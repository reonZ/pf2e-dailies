import { ActorInventory, ActorPF2e, getFlag, MODULE, PhysicalItemPF2e } from "module-helpers";

function onActorPrepareEmbeddedDocuments<TActor extends ActorPF2e>(
    this: TActor,
    wrapped: libWrapper.RegisterCallback
): void {
    wrapped();

    try {
        Object.defineProperty(this.inventory, "deleteTemporaryItems", {
            value: async function (
                this: ActorInventory<TActor>,
                operation?: Partial<DatabaseDeleteOperation<TActor>>
            ): Promise<PhysicalItemPF2e<TActor>[]> {
                const actor = this.actor;
                const specialResourceItems = Object.values(actor.synthetics.resources)
                    .map((r) => r.itemUUID)
                    .filter((i) => !!i);
                const itemsToDelete = this.actor.inventory
                    .filter(
                        (i) =>
                            i.system.temporary &&
                            !getFlag(i, "temporary") &&
                            (!i.sourceId || !specialResourceItems.includes(i.sourceId))
                    )
                    .map((i) => i.id);

                if (itemsToDelete.length) {
                    const deletedItems = await actor.deleteEmbeddedDocuments(
                        "Item",
                        itemsToDelete,
                        operation
                    );
                    return deletedItems as PhysicalItemPF2e<TActor>[];
                }

                return [];
            },
        });
    } catch (error) {
        MODULE.error("ActorPF2e#prepareEmbeddedDocuments", error);
    }
}

export { onActorPrepareEmbeddedDocuments };
