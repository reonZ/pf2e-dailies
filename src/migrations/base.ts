import { ActorSourcePF2e, getFlagProperty } from "module-helpers";

function createMigrateActorFlag(
    callback: (actorFlag: { [k: string]: any }) => Promisable<boolean>
) {
    return (actorSource: ActorSourcePF2e) => {
        if (actorSource.type !== "character") return false;

        const flag = getFlagProperty<{ [k: string]: any }>(actorSource);
        if (!flag) return false;

        return callback(flag);
    };
}

export { createMigrateActorFlag };
