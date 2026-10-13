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
    Statistic,
    WeaponPF2e,
} from "foundry-helpers";
import { utils } from "utils";
import { zStaffData } from ".";

const ACTIVATIONS_ENTRY_TYPES: Record<dailies.ActivationType, ActivationsEntriesData> = {
    servers: {
        canCast: canSpellServerCastRank,
        getData: getSpellServerData,
        setCharges: setSpellServerChargesValue,
    },
    staves: {
        canCast: canStaffCastRank,
        getData: getStaffData,
        setCharges: setStaffChargesValue,
    },
};

let _staffData: ReturnType<typeof zStaffData> | undefined;

function getPreparedSpellcastingData(
    actor: CharacterPF2e,
): { maxCharges: number; specialStatistic: Statistic<CharacterPF2e> | null } | undefined {
    let maxCharges = 0;
    const actorCharges = utils.getActorMaxRank(actor);
    const specialStatistic = actor.getStatistic("kinetic-activation");

    if (specialStatistic) {
        maxCharges = Math.max(maxCharges, actorCharges);
    } else {
        maxCharges = utils.getSpellcastingMaxRank(actor, { rankLimit: actorCharges });
    }

    if (!maxCharges) {
        return;
    }

    return { maxCharges, specialStatistic };
}

function getData(actor: CharacterPF2e, type: dailies.ActivationType): dailies.ActivationFlag | undefined {
    const flag = getFlag<dailies.ActivationFlag>(actor, `extra.dailies.${type}`);
    return (_staffData ??= zStaffData()).safeParse(flag).data as dailies.ActivationFlag | undefined;
}

function getStaffData(actor: CharacterPF2e): dailies.ActivationFlag | undefined {
    return getData(actor, "staves");
}

function getSpellServerData(actor: CharacterPF2e): dailies.ActivationFlag | undefined {
    return getData(actor, "servers");
}

function canCastRank(type: dailies.ActivationType, actor: CharacterPF2e, rank: number): boolean | null {
    const dataFlag = ACTIVATIONS_ENTRY_TYPES[type].getData(actor);
    if (!dataFlag) return null;

    const item = actor.inventory.get(dataFlag.staffId);
    if (!item) return null;

    if (rank === 0) return true;

    const maxRank = getActorMaxRank(actor);
    if (rank > maxRank) return false;

    const charges = dataFlag.charges.value;

    if (charges < 1) return false;
    if (charges >= rank) return true;

    if (dataFlag.expended && charges < rank) return false;

    const range = R.range(rank, maxRank + 1) as OneToTen[];
    const entries = actor.spellcasting.filter(
        (entry): entry is SpellcastingEntryPF2e<CharacterPF2e> => entry.category === "spontaneous",
    );

    const nbSlots = R.pipe(
        entries,
        R.flatMap((e) => range.map((r) => e.system.slots[`slot${r}`])),
        R.filter((d) => d.max > 0),
        R.sumBy(R.prop("value")),
    );

    return nbSlots >= 1;
}

function canStaffCastRank(actor: CharacterPF2e, rank: number): boolean | null {
    return canCastRank("staves", actor, rank);
}

function canSpellServerCastRank(actor: CharacterPF2e, rank: number): boolean | null {
    return canCastRank("servers", actor, rank);
}

function setStaffChargesValue(actor: CharacterPF2e, value?: number): Promise<CharacterPF2e> | undefined {
    const charges = getStaffData(actor)?.charges;
    if (!charges || (value != null && charges.value === value)) return;

    return setFlag(actor, "extra.dailies.staves.charges.value", Math.clamp(value ?? charges.max, 0, charges.max));
}

function setSpellServerChargesValue(actor: CharacterPF2e, value?: number): Promise<CharacterPF2e> | undefined {
    const charges = getSpellServerData(actor)?.charges;
    if (!charges || (value != null && charges.value === value)) return;

    return setFlag(actor, "extra.dailies.servers.charges.value", Math.clamp(value ?? charges.max, 0, charges.max));
}

function isStaff(item: ItemPF2e): boolean {
    const traits = item.system.traits?.value;

    return (
        !!traits?.includes("staff") &&
        (item.isOfType("weapon") || (item.isOfType("equipment") && traits.includes("coda"))) &&
        item.isMagical
    );
}

function isSpellServer(item: ItemPF2e): boolean {
    return item.isOfType("equipment") && item.system.traits?.value.includes("spell-server") && item.isMagical;
}

function getStaves<TActor extends CharacterPF2e | NPCPF2e>(actor: TActor): ActorStaff<TActor>[] {
    return [
        ...actor.itemTypes.weapon.filter(isStaff),
        ...actor.itemTypes.equipment.filter(isStaff),
    ] as ActorStaff<TActor>[];
}

function getSpellServers<TActor extends CharacterPF2e | NPCPF2e>(actor: TActor): EquipmentPF2e<TActor>[] {
    return actor.itemTypes.equipment.filter(isSpellServer) as EquipmentPF2e<TActor>[];
}

function setSpecialStatisticData(data: dailies.ActivationFlag, statistic: Statistic<CharacterPF2e> | null) {
    // we only handle kineticist activation for now
    if (statistic?.slug === "kinetic-activation") {
        data.statistic = { slug: statistic.slug, tradition: "primal" };
    }
}

type ActorStaff<TActor extends CharacterPF2e | NPCPF2e = CharacterPF2e | NPCPF2e> =
    EquipmentPF2e<TActor> | WeaponPF2e<TActor>;

type ActivationsEntriesData = {
    canCast: (actor: CharacterPF2e, rank: number) => boolean | null;
    getData: (actor: CharacterPF2e) => dailies.ActivationFlag | undefined;
    setCharges: (actor: CharacterPF2e, value?: number) => Promise<CharacterPF2e> | undefined;
};

export {
    ACTIVATIONS_ENTRY_TYPES,
    canSpellServerCastRank,
    canStaffCastRank,
    getPreparedSpellcastingData,
    getSpellServerData,
    getSpellServers,
    getStaffData,
    getStaves,
    isSpellServer,
    isStaff,
    setSpecialStatisticData,
    setSpellServerChargesValue,
    setStaffChargesValue,
};
export type { ActivationsEntriesData, ActorStaff };
