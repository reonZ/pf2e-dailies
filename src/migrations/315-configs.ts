import { ModuleMigration } from "module-helpers/dist/migration";
import { createMigrateActorFlag } from "./base";

export default {
    version: 3.15,
    migrateActor: createMigrateActorFlag((actorFlag) => {
        let updated = false;

        for (const key of ["familiar", "animist"]) {
            if (key in actorFlag) {
                updated = true;
                actorFlag[`-=${key}`] = true;
                foundry.utils.setProperty(actorFlag, `config.dailies.${key}`, actorFlag[key]);
            }
        }

        return updated;
    }),
} satisfies ModuleMigration;
