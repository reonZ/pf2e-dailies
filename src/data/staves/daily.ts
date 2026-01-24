import { createDaily, DailyRowSelect, DailyRowSelectOption, DailyRowSelectOptionValue } from "daily";
import {
    CharacterPF2e,
    FeatPF2e,
    hasItemWithSourceId,
    localize,
    R,
    SlotKey,
    SpellcastingEntryPF2e,
    WeaponPF2e,
    ZeroToTen,
} from "module-helpers";
import { utils } from "utils";
import { getSpells, getStaves, isStaff } from ".";

const KINETIC_ACTIVATION = "Compendium.pf2e.feats-srd.Item.NV9H39kbkbjhAK6X";
const STAFF_NEXUS = "Compendium.pf2e.classfeatures.Item.Klb35AwlkNrq1gpB";

const RUNELORD_SINS = [
    "Compendium.pf2e.classfeatures.Item.Fh5Khtx5bgGpBeOu", // envy
    "Compendium.pf2e.classfeatures.Item.hzATJ1FV3lTPgeG9", // gluttony
    "Compendium.pf2e.classfeatures.Item.COMhWWNBJOdaJqp7", // greed
    "Compendium.pf2e.classfeatures.Item.MpZ0sdwMJ8fdZmtR", // lust
    "Compendium.pf2e.classfeatures.Item.GI09dKNZVCPdSGZC", // pride
    "Compendium.pf2e.classfeatures.Item.cz9fwc6KSkqxD3Nn", // sloth
    "Compendium.pf2e.classfeatures.Item.wtPywk3wqEg3iYOP", // wrath
];

const staves = createDaily({
    key: "staves",
    condition: (actor) => {
        return (
            actor.itemTypes.weapon.some(isStaff) ||
            actor.itemTypes.equipment.some(isStaff) ||
            (!!getRunelordSin(actor) && getPotentialBonds(actor).length > 0)
        );
    },
    prepare: (actor) => {
        const entries = actor.spellcasting.spellcastingFeatures;

        let maxCharges = 0;
        const actorCharges = utils.getActorMaxRank(actor);
        const activationType =
            actor.getStatistic("kineticist") && hasItemWithSourceId(actor, KINETIC_ACTIVATION, "feat")
                ? "kineticist"
                : undefined;

        if (activationType) {
            maxCharges = Math.max(maxCharges, actorCharges);
        } else {
            maxCharges = utils.getSpellcastingMaxRank(actor, { rankLimit: actorCharges });
        }

        if (!maxCharges) {
            return {};
        }

        const preparedEntries: Record<string, FlexiblePreparedEntryGroup | PreparedEntryGroup> = {};

        for (const entry of entries.filter((entry) => entry.isPrepared)) {
            const entryId = entry.id;
            const isFlexible = entry.isFlexible;

            for (let rank = 1; rank <= 10; rank++) {
                const slotKey = `slot${rank}` as SlotKey;
                const data = entry.system.slots[slotKey];

                if (data.max < 1) continue;

                if (isFlexible) {
                    if (data.value < 1) continue;

                    preparedEntries[entryId] ??= {
                        id: entryId,
                        name: entry.name,
                        slots: [],
                    };

                    (preparedEntries[entryId] as FlexiblePreparedEntryGroup).slots.push({
                        rank: rank as ZeroToTen,
                        value: data.value,
                        max: data.max,
                    });
                } else {
                    for (const [index, { id, expended }] of Object.entries(data.prepared)) {
                        if (expended) continue;

                        const spell = id ? entry.spells?.get(id) : undefined;

                        preparedEntries[entryId] ??= {
                            id: entryId,
                            name: entry.name,
                            spells: [],
                        };

                        (preparedEntries[entryId] as PreparedEntryGroup).spells.push({
                            name: spell?.name,
                            rank: rank as ZeroToTen,
                            index: Number(index),
                        });
                    }
                }
            }

            (preparedEntries[entryId] as PreparedEntryGroup | undefined)?.spells?.sort((a, b) => a.rank - b.rank);
        }

        const runelordSin = getRunelordSin(actor);

        return { entries, maxCharges, preparedEntries, activationType, runelordSin };
    },
    rows: (actor, items, custom) => {
        if (!custom.entries) {
            return [];
        }

        const rows = [] as (
            | DailyRowSelect<`expend${number}`>
            | DailyRowSelect<"type">
            | DailyRowSelect<"staff">
            | DailyRowSelect<"bond">
        )[];

        const isRunelord = !!custom.runelordSin;
        const hasStaffNexus = hasItemWithSourceId(actor, STAFF_NEXUS, "feat");

        const weapons = isRunelord
            ? getPotentialBonds(actor).map((weapon) => {
                  return { value: weapon.id, label: weapon.name };
              })
            : [];

        const hasWeapon = weapons.length > 0;

        if (hasWeapon) {
            rows.push({
                type: "select",
                slug: "bond",
                label: localize("staves.bond"),
                options: weapons,
            });
        }

        const staves = getStaves(actor).map((staff) => {
            return { value: staff.id, label: staff.name };
        });

        if (staves.length) {
            rows.push({
                type: "select",
                slug: "staff",
                label: "PF2E.Weapon.Base.staff",
                empty: hasWeapon,
                options: hasWeapon ? [{ value: "", label: "" }, ...staves] : staves,
            });
        }

        if (hasStaffNexus) {
            const typeRow = {
                type: "select",
                slug: "type",
                label: localize("interface.staves.type"),
                options: ["makeshift", "regular"].map((value) => {
                    return { value, label: localize("interface.staves", value) };
                }),
            } as const satisfies DailyRowSelect;

            rows.push(typeRow);
        }

        const preparedEntries = Object.values(custom.preparedEntries);

        if (!preparedEntries.length) {
            return rows;
        }

        const level = actor.level;
        const options: DailyRowSelectOption[] = [{ value: "", label: "" }];
        const flexibleLabel = localize("interface.staves.flexible");
        const emptyLabel = localize("interface.staves.empty");
        const nbExpends = hasStaffNexus && level >= 8 ? (level >= 16 ? 3 : 2) : 1;

        for (const entry of Object.values(preparedEntries)) {
            options.push({ group: entry.name });

            if ("slots" in entry) {
                for (let index = 0; index < entry.slots.length; index++) {
                    const slot = entry.slots[index];
                    const rankLabel = utils.getSpellRankLabel(slot.rank);
                    const uniqueKey = `${entry.id}.slots.${index}`;
                    const option: DailyRowSelectOptionValue = {
                        value: uniqueKey,
                        label: `${flexibleLabel} ${slot.value}/${slot.max} (${rankLabel})`,
                    };

                    if (slot.value >= nbExpends) {
                        option.skipUnique = true;
                    } else {
                        option.unique = uniqueKey;
                    }

                    options.push(option);
                }
            } else {
                for (let index = 0; index < entry.spells.length; index++) {
                    const spell = entry.spells[index];
                    const name = spell.name ?? emptyLabel;
                    const uniqueKey = `${entry.id}.spells.${index}`;
                    const rankLabel = utils.getSpellRankLabel(spell.rank);

                    options.push({
                        value: uniqueKey,
                        label: `${name} (${rankLabel})`,
                        unique: uniqueKey,
                    });
                }
            }
        }

        const uniqueId = foundry.utils.randomID();

        rows.push(
            ...R.range(1, nbExpends + 1).map((i) => {
                return {
                    type: "select",
                    slug: `expend${i}`,
                    save: false,
                    empty: true,
                    label: localize("label.expend", { nb: i }),
                    unique: uniqueId,
                    options,
                } as const;
            }),
        );

        return rows;
    },
    process: async ({ actor, rows, custom, messages, flagItem, updateItem, setExtraFlags }) => {
        const sin = custom.runelordSin;
        const bond = sin && rows.bond ? actor.inventory.get(rows.bond) : null;
        const staff = rows.staff ? actor.inventory.get(rows.staff) : null;
        if (!custom.entries || (!staff && !bond)) return;

        const maxCharges = custom.maxCharges;
        const sinSpells = await getSpells(sin, maxCharges);
        const staffSpells = await getSpells(staff, maxCharges);
        if (!sinSpells.length && !staffSpells.length) return;

        let overcharge = 0;
        const spellcasting = actor.spellcasting!;
        const preparedEntries = custom.preparedEntries;
        const flexibleLabel = localize("interface.staves.flexible");
        const emptyLabel = localize("interface.staves.empty");
        const expendedSpells: { name: string; rank: ZeroToTen; uuid?: string }[] = [];
        const slotsUpdates: Record<string, Record<string, number>> = {};

        const expendedRows = R.pipe(rows, R.omit(["staff", "type", "bond"]), R.values(), R.filter(R.isTruthy));

        const preparedUpdates: Record<
            string,
            Partial<Record<ZeroToTen, { id: string | null; expended: boolean }[]>>
        > = {};

        for (const preparedPath of expendedRows) {
            const entryId = preparedPath?.split(".")[0];
            const entry = spellcasting.get(entryId) as SpellcastingEntryPF2e<CharacterPF2e>;
            const preparedData = foundry.utils.getProperty(preparedEntries, preparedPath) as
                | FlexiblePreparedEntryGroup["slots"][number]
                | PreparedEntryGroup["spells"][number];

            if (!entry || !preparedData) continue;

            const rank = preparedData.rank;
            const slot = entry.system.slots[`slot${rank}`];

            if ("max" in preparedData) {
                if (slot.max < 1 || slot.value < 1) continue;

                slotsUpdates[entryId] ??= {};
                slotsUpdates[entryId][rank] ??= slot.value;

                const currentValue = slotsUpdates[entryId][rank];

                if (currentValue < 1) continue;

                overcharge += rank;
                slotsUpdates[entryId][rank] -= 1;

                updateItem({
                    _id: entryId,
                    [`system.slots.slot${rank}.value`]: currentValue - 1,
                });

                expendedSpells.push({
                    name: flexibleLabel,
                    rank,
                });
            } else {
                const entryUpdates = (preparedUpdates[entryId] ??= {});
                const prepared = (entryUpdates[rank] ??= foundry.utils.deepClone(slot.prepared));
                const preparedSlot = prepared[preparedData.index];

                if (slot.max < 1 || preparedSlot.expended) continue;

                overcharge += rank;
                preparedSlot.expended = true;

                const spell = preparedSlot.id ? actor.items.get(preparedSlot.id) : undefined;

                expendedSpells.push({
                    uuid: spell?.uuid,
                    name: spell?.name ?? emptyLabel,
                    rank,
                });
            }
        }

        for (const [entryId, slots] of R.entries(preparedUpdates)) {
            for (const [rank, prepared] of R.entries(slots)) {
                updateItem({
                    _id: entryId,
                    [`system.slots.slot${rank}.prepared`]: prepared,
                });
            }
        }

        const isMerged = !!bond && !!staff;
        const isMakeshift = rows.type === "makeshift";
        const charges = (isMakeshift ? 0 : maxCharges) + overcharge;

        const staffData: dailies.StaffFlags = {
            staffId: bond?.id ?? staff!.id,
            charges: {
                value: charges,
                max: charges,
            },
            expended: expendedSpells.length > 0,
            spells: [...sinSpells, ...staffSpells],
        };

        if (custom.activationType) {
            const statistic =
                // we only handle kineticist activation for now
                actor.synthetics.statistics.get("impulse") ?? actor.synthetics.statistics.get("kinetic-activation");

            if (statistic) {
                staffData.statistic = { slug: statistic.slug, tradition: "primal" };
            }
        }

        setExtraFlags(staffData);

        const staffType = localize("interface.staves", isMakeshift ? "makeshift" : "staff");
        const groupLabel = isMerged ? "merged" : !!bond ? "bond" : "prepared";

        messages.addGroup("staff", localize("interface.staves.group", groupLabel, { type: staffType }), 45);

        if (bond) {
            flagItem(bond, localize("staves.bond"));
            messages.add("staff", { uuid: bond.uuid });
        }

        if (staff) {
            messages.add("staff", { uuid: staff.uuid });
        }

        for (const { name, rank, uuid } of expendedSpells) {
            const rankLabel = utils.getSpellRankLabel(rank);
            const label = `${name} (${rankLabel})`;

            messages.add("staff", {
                uuid,
                label: uuid
                    ? label
                    : `<span class="fake-link">
                    <i class='fa-solid fa-sparkles'></i>
                    ${label}
                </span>`,
            });
        }
    },
});

function getRunelordSin(actor: CharacterPF2e): FeatPF2e<CharacterPF2e> | undefined {
    for (const item of actor.itemTypes.feat) {
        if (item.suppressed) continue;

        const sourceId = item.sourceId;
        if (sourceId && RUNELORD_SINS.includes(sourceId)) {
            return item;
        }
    }
}

function getPotentialBonds(actor: CharacterPF2e): WeaponPF2e<CharacterPF2e>[] {
    return actor.itemTypes.weapon.filter((weapon) => !isStaff(weapon));
}

type PreparedEntryGroup = {
    id: string;
    name: string;
    spells: {
        name?: string;
        rank: ZeroToTen;
        index: number;
    }[];
};

type FlexiblePreparedEntryGroup = {
    id: string;
    name: string;
    slots: {
        rank: ZeroToTen;
        value: number;
        max: number;
    }[];
};

export { staves };
