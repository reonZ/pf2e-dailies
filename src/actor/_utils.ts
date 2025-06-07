import { getDailies } from "dailies";
import { DailyConfigRowValue, DailyRowData } from "daily";
import { DailyInterface } from "interface";
import { ActorPF2e, CharacterPF2e, getFlag, ItemSourcePF2e, localize } from "module-helpers";

function canPrepareDailies(actor: ActorPF2e): boolean {
    return isValidCharacter(actor) && getActorFlag(actor, "rested") !== false;
}

function isValidCharacter(actor: Maybe<ActorPF2e>): actor is CharacterPF2e {
    return actor instanceof Actor && actor.isOfType("character");
}

function getActorFlag<K extends keyof DailyActorFlags>(
    actor: CharacterPF2e,
    key: K
): DailyActorFlags[K] | undefined {
    return getFlag<DailyActorFlags[K]>(actor, key);
}

function getDailiesSummary(actor: Maybe<ActorPF2e>): string {
    return (isValidCharacter(actor) && getFlag(actor, "tooltip")) || localize("sheet.unrested");
}

function getDisabledDailies(actor: CharacterPF2e) {
    const flag = getActorFlag(actor, "disabled") ?? {};
    return foundry.utils.flattenObject(flag) as Record<string, boolean>;
}

async function openDailiesInterface(actor: Maybe<ActorPF2e>) {
    if (!isValidCharacter(actor) || !actor.isOwner || !canPrepareDailies(actor)) {
        return;
    }

    const dailies = await getDailies(actor);
    new DailyInterface(actor, dailies).render(true);
}

type DailyActorFlags = {
    rested?: boolean;
    addedItems?: string[];
    config?: Record<string, DailyConfigRowValue>;
    extra?: Record<string, any>;
    disabled?: Record<string, Record<string, DailyRowData>>;
    dailies?: Record<string, Record<string, DailyRowData>>;
    custom?: Record<string, Record<string, DailyRowData>>;
    tooltip?: string;
    temporaryDeleted?: Record<string, ItemSourcePF2e>;
};

export {
    canPrepareDailies,
    getActorFlag,
    getDailiesSummary,
    getDisabledDailies,
    openDailiesInterface,
};
export type { DailyActorFlags };
