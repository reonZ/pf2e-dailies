import {
    ActorPF2e,
    CharacterPF2e,
    ItemPF2e,
    OneToTen,
    R,
    SpellcastingEntryPF2e,
    getActorMaxRank,
    getFlag,
    localize,
    setFlag,
} from "module-helpers";
import { DailyInterface } from "./apps/interface";
import { getDailies } from "./dailies";
import type { DailyActorFlags, SimplifiableValue } from "./types";

function isValidActor(actor: ActorPF2e): actor is CharacterPF2e {
    return actor instanceof Actor && actor.isOfType("character");
}

function canPrepareDailies(actor: ActorPF2e) {
    return isValidActor(actor) && getActorFlag(actor, "rested") !== false;
}

async function openDailiesInterface(actor: ActorPF2e) {
    if (!isValidActor(actor) || !actor.isOwner || !canPrepareDailies(actor)) {
        return;
    }

    const id = `pf2e-dailies-interface-${actor.uuid}`;
    const dailies = await getDailies(actor);

    new DailyInterface(actor, dailies, { id }).render(true);
}

function getDailiesSummary(actor: ActorPF2e): string {
    return (isValidActor(actor) && getFlag(actor, "tooltip")) || localize("sheet.unrested");
}

function getDisabledDailies(actor: CharacterPF2e) {
    const flag = getActorFlag(actor, "disabled") ?? {};
    return foundry.utils.flattenObject(flag) as Record<string, boolean>;
}

function simplifyValue(actor: ActorPF2e, value: SimplifiableValue) {
    if (typeof value === "number") return value;

    if (value === "level") return actor.level;

    if (value === "half") {
        return Math.max(1, Math.floor(actor.level / 2));
    }

    const numbered = Number(value) || 0;
    return Number.isNaN(numbered) ? undefined : numbered;
}

function isSimplifiableValue(value: any): value is SimplifiableValue {
    return (
        typeof value === "number" ||
        value === "level" ||
        value === "half" ||
        (typeof value === "string" && !Number.isNaN(Number(value)))
    );
}

function createUpdateCollection<T extends EmbeddedDocumentUpdateData>(): [
    Collection<T>,
    (data: T) => void
] {
    const collection = new Collection<T>();

    return [
        collection,
        (data: T) => {
            if (data._id) {
                const update = collection.get(data._id) ?? {};
                collection.set(data._id, foundry.utils.mergeObject(update, data));
            }
        },
    ];
}

function getActorFlag<K extends keyof DailyActorFlags>(actor: CharacterPF2e, key: K) {
    return getFlag<DailyActorFlags[K]>(actor, key);
}

function isTemporary(item: ItemPF2e) {
    return !!getFlag<boolean>(item, "temporary");
}

function getStaffFlags(actor: CharacterPF2e) {
    return getFlag<dailies.StaffFlags>(actor, "extra.dailies.staves");
}

function getStaffItem(actor: CharacterPF2e) {
    const flag = getStaffFlags(actor);
    return (flag && actor.inventory.get(flag.staffId)) || null;
}

function setStaffChargesValue(actor: CharacterPF2e, value?: number) {
    const charges = getStaffFlags(actor)?.charges;
    if (!charges || (value != null && charges.value === value)) return;

    return setFlag(
        actor,
        "extra.dailies.staves.charges.value",
        Math.clamp(value ?? charges.max, 0, charges.max)
    );
}

function canCastRank<TPArent extends CharacterPF2e>(actor: TPArent, rank: number) {
    const staffFlags = getStaffFlags(actor);
    if (!staffFlags) return null;

    const staff = actor.inventory.get(staffFlags.staffId);
    if (!staff) return null;

    if (rank === 0) return true;

    const maxRank = getActorMaxRank(actor);
    if (rank > maxRank) return false;

    const charges = staffFlags.charges.value;

    if (charges < 1) return false;
    if (charges >= rank) return true;

    if (staffFlags.expended && charges < rank) return false;

    const range = R.range(rank, maxRank + 1) as OneToTen[];
    const entries = actor.spellcasting.filter(
        (entry): entry is SpellcastingEntryPF2e<TPArent> => entry.isSpontaneous
    );

    const nbSlots = R.pipe(
        entries,
        R.flatMap((e) => range.map((r) => e.system.slots[`slot${r}`])),
        R.filter((d) => d.max > 0),
        R.sumBy(R.prop("value"))
    );

    return nbSlots >= 1;
}

function getAnimistConfigs(actor: CharacterPF2e) {
    return foundry.utils.mergeObject(
        { lores: true, spells: true, signatures: true },
        getFlag(actor, "config.dailies.animist") ?? {}
    );
}

export {
    canCastRank,
    canPrepareDailies,
    createUpdateCollection,
    getActorFlag,
    getAnimistConfigs,
    getDailiesSummary,
    getDisabledDailies,
    getStaffFlags,
    getStaffItem,
    isSimplifiableValue,
    isTemporary,
    openDailiesInterface,
    setStaffChargesValue,
    simplifyValue,
};
