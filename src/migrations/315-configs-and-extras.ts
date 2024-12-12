import { R } from "module-helpers";
import { createMigrateCharacterFlag } from "./base";

const EXTRA_OMIT_KEYS = ["staffData", "dailies", "custom", "module"];

export default createMigrateCharacterFlag(3.15, (actorFlag) => {
    let updated = false;

    for (const key of ["familiar", "animist"]) {
        if (key in actorFlag) {
            updated = true;
            actorFlag[`-=${key}`] = true;
            foundry.utils.setProperty(actorFlag, `config.dailies.${key}`, actorFlag[key]);
        }
    }

    if (R.isPlainObject(actorFlag.extra)) {
        const customs = R.omit(actorFlag.extra, EXTRA_OMIT_KEYS);
        const customKeys = R.keys(customs);

        if (customKeys.length) {
            updated = true;

            actorFlag.extra.custom = foundry.utils.mergeObject(
                actorFlag.extra.custom ?? {},
                customs,
                { inplace: false }
            );

            for (const key of customKeys) {
                actorFlag.extra[`-=${key}`] = true;
            }
        }

        if ("staffData" in actorFlag.extra) {
            updated = true;
            actorFlag.extra["-=staffData"] = true;
            actorFlag.extra["dailies.staves"] = actorFlag.extra.staffData;
        }
    }

    return updated;
});
