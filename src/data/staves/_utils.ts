import {
    CharacterPF2e,
    createHTMLElement,
    EquipmentPF2e,
    getActorMaxRank,
    getFlag,
    htmlQueryAll,
    ItemPF2e,
    NPCPF2e,
    OneToTen,
    R,
    setFlag,
    SpellcastingEntryPF2e,
    SpellSource,
    WeaponPF2e,
    ZeroToTen,
} from "module-helpers";
import { getUuidFromInlineMatch } from "utils";

const LABEL_REGEX = /\d+/;
const UUID_REGEX = /@(uuid|compendium)\[([a-z0-9\._-]+)\]/gi;

function getStaffData(actor: CharacterPF2e): dailies.StaffFlags | undefined {
    return getFlag<dailies.StaffFlags>(actor, "extra.dailies.staves");
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
        (entry): entry is SpellcastingEntryPF2e<TPArent> => entry.category === "spontaneous"
    );

    const nbSlots = R.pipe(
        entries,
        R.flatMap((e) => range.map((r) => e.system.slots[`slot${r}`])),
        R.filter((d) => d.max > 0),
        R.sumBy(R.prop("value"))
    );

    return nbSlots >= 1;
}

function setStaffChargesValue(actor: CharacterPF2e, value?: number) {
    const charges = getStaffData(actor)?.charges;
    if (!charges || (value != null && charges.value === value)) return;

    return setFlag(
        actor,
        "extra.dailies.staves.charges.value",
        Math.clamp(value ?? charges.max, 0, charges.max)
    );
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

async function getSpells(
    item: Maybe<ItemPF2e>,
    maxRank: number,
    entryId: string | null = null
): Promise<SpellSource[]> {
    if (!item) return [];

    const descriptionEl = createHTMLElement("div", { content: item.description });
    const spellLists = descriptionEl.querySelectorAll("ul");
    const spellList = spellLists[spellLists.length - 1];
    if (!spellList) return [];

    const spellsData = R.pipe(
        htmlQueryAll(spellList, "li"),
        R.flatMap((SpellRankEL) => {
            const label = SpellRankEL.firstChild as HTMLElement;
            const rank = Number(label.textContent?.match(LABEL_REGEX)?.[0] || "0") as ZeroToTen;
            const text = SpellRankEL.textContent ?? "";
            const uuids = Array.from(text.matchAll(UUID_REGEX)).map(getUuidFromInlineMatch);

            return uuids.map((uuid) => ({ rank, uuid }));
        }),
        R.filter(({ rank }) => rank <= maxRank)
    );

    const spells = await Promise.all(
        spellsData.map(async ({ rank, uuid }) => {
            const spell = await fromUuid<ItemPF2e>(uuid);
            if (!(spell instanceof Item) || !spell.isOfType("spell")) return;

            const source = spell.toObject();

            source._id = foundry.utils.randomID();

            foundry.utils.setProperty(source, "system.location", {
                value: entryId,
                heightenedLevel: rank,
            });

            return source;
        })
    );

    return R.filter(spells, R.isTruthy);
}

type ActorStaff<TActor extends CharacterPF2e | NPCPF2e = CharacterPF2e | NPCPF2e> =
    | EquipmentPF2e<TActor>
    | WeaponPF2e<TActor>;

export { canCastRank, getSpells, getStaffData, getStaves, isStaff, setStaffChargesValue };
export type { ActorStaff };
