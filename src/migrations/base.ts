import { ActorSourcePF2e, getFlagProperty, R } from "module-helpers";
import { ModuleMigration } from "module-helpers/dist/migration";

function createMigrateCharacterFlag(
    version: number,
    migrateActor: (actorFlag: { [k: string]: unknown }) => Promisable<boolean>
) {
    return {
        version,
        migrateActor: (actorSource: ActorSourcePF2e) => {
            if (actorSource.type !== "character") return false;

            const flag = getFlagProperty(actorSource);
            if (!R.isPlainObject(flag)) return false;

            return migrateActor(flag);
        },
    } satisfies ModuleMigration;
}

export { createMigrateCharacterFlag };
