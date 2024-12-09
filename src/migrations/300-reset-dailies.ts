import { R } from "module-helpers";
import { ModuleMigration } from "module-helpers/dist/migration";
import { createMigrateActorFlag } from "./base";

export default {
    version: 3.0,
    migrateActor: createMigrateActorFlag((actorFlag) => {
        let updated = false;

        if ("schema" in actorFlag) {
            updated = true;
            actorFlag["-=schema"] = true;
        } else {
            const keys = R.pipe(
                R.keys(actorFlag),
                R.filter((x) => x !== "rested")
            );

            if (keys.length) {
                updated = true;

                for (const key of keys) {
                    actorFlag[`-=${key}`] = true;
                }
            }
        }

        return updated;
    }),
} satisfies ModuleMigration;
