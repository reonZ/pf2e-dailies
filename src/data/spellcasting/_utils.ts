import {
    CharacterPF2e,
    EquipmentPF2e,
    getActorMaxRank,
    getFlag,
    ItemPF2e,
    NPCPF2e,
    OneToTen,
    R,
    setFlag,
    SpellcastingEntryPF2e,
    WeaponPF2e,
} from "foundry-helpers";
import { zStaffData } from ".";

let _staffData: ReturnType<typeof zStaffData> | undefined;

function getStaffData(actor: CharacterPF2e): dailies.StaffFlags | undefined {
    const flag = getFlag<dailies.StaffFlags>(actor, "extra.dailies.staves");
    return (_staffData ??= zStaffData()).safeParse(flag).data as dailies.StaffFlags | undefined;
}

function canCastRank<TPArent extends CharacterPF2e>(actor: TPArent, rank: number) {
    const staffFlags = getStaffData(actor);
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
        (entry): entry is SpellcastingEntryPF2e<TPArent> => entry.category === "spontaneous",
    );

    const nbSlots = R.pipe(
        entries,
        R.flatMap((e) => range.map((r) => e.system.slots[`slot${r}`])),
        R.filter((d) => d.max > 0),
        R.sumBy(R.prop("value")),
    );

    return nbSlots >= 1;
}

function setStaffChargesValue(actor: CharacterPF2e, value?: number) {
    const charges = getStaffData(actor)?.charges;
    if (!charges || (value != null && charges.value === value)) return;

    return setFlag(actor, "extra.dailies.staves.charges.value", Math.clamp(value ?? charges.max, 0, charges.max));
}

function isStaff(item: ItemPF2e) {
    const traits = item.system.traits?.value;

    return (
        traits?.includes("staff") &&
        (item.isOfType("weapon") || (item.isOfType("equipment") && traits.includes("coda"))) &&
        item.isMagical
    );
}

function getStaves<TActor extends CharacterPF2e | NPCPF2e>(actor: TActor): ActorStaff<TActor>[] {
    return [
        ...actor.itemTypes.weapon.filter(isStaff),
        ...actor.itemTypes.equipment.filter(isStaff),
    ] as ActorStaff<TActor>[];
}

type ActorStaff<TActor extends CharacterPF2e | NPCPF2e = CharacterPF2e | NPCPF2e> =
    EquipmentPF2e<TActor> | WeaponPF2e<TActor>;

export { canCastRank, getStaffData, getStaves, isStaff, setStaffChargesValue };
export type { ActorStaff };
