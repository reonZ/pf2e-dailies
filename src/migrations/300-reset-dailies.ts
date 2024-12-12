import { R } from "module-helpers";
import { createMigrateCharacterFlag } from "./base";

export default createMigrateCharacterFlag(3.0, (actorFlag) => {
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
});
