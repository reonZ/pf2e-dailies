import { ActorSourcePF2e, getFlagProperty, R } from "module-helpers";

function createMigrateActorFlag(
    callback: (actorFlag: { [k: string]: unknown }) => Promisable<boolean>
) {
    return (actorSource: ActorSourcePF2e) => {
        if (actorSource.type !== "character") return false;

        const flag = getFlagProperty(actorSource);
        if (!R.isPlainObject(flag)) return false;

        return callback(flag);
    };
}

export { createMigrateActorFlag };
