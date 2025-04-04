import {
    AttributeString,
    CastOptions,
    CharacterPF2e,
    createCounteractStatistic,
    createHTMLElement,
    CreaturePF2e,
    elementDataset,
    EquipmentPF2e,
    error,
    ErrorPF2e,
    getActorMaxRank,
    getItemWithSourceId,
    getRankLabel,
    getUuidFromInlineMatch,
    hasItemWithSourceId,
    htmlQuery,
    htmlQueryAll,
    isInstanceOf,
    ItemPF2e,
    localize,
    MagicTradition,
    NPCPF2e,
    OneToFour,
    OneToTen,
    Predicate,
    PredicateStatement,
    R,
    SlotKey,
    SpellcastingEntryPF2e,
    SpellcastingEntrySystemData,
    SpellcastingEntryWithCharges,
    SpellcastingSlotGroup,
    SpellCollection,
    SpellPF2e,
    SpellSource,
    Statistic,
    subLocalize,
    waitDialog,
    warn,
    WeaponPF2e,
    ZeroToTen,
} from "module-helpers";
import { canCastRank, getStaffFlags, setStaffChargesValue } from "../api";
import { createDaily } from "../daily";
import {
    ChargesSpellcastingSheetData,
    DailyRowSelect,
    DailyRowSelectOption,
    DailyRowSelectOptionValue,
} from "../types";
import { utils } from "../utils";

const UUID_REGEX = /@(uuid|compendium)\[([a-z0-9\._-]+)\]/gi;
const LABEL_REGEX = /\d+/;

const i18n = subLocalize("interface.staves");

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
            actor.getStatistic("kineticist") &&
            hasItemWithSourceId(actor, KINETIC_ACTIVATION, "feat")
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

            (preparedEntries[entryId] as PreparedEntryGroup | undefined)?.spells?.sort(
                (a, b) => a.rank - b.rank
            );
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

        if (isRunelord) {
            const weapons = getPotentialBonds(actor).map((weapon): SelectOption => {
                return { value: weapon.id, label: weapon.name };
            });

            rows.push({
                type: "select",
                slug: "bond",
                label: i18n("bond"),
                options: weapons,
            });
        }

        const staves: SelectOptions = getStaves(actor).map((staff) => {
            return { value: staff.id, label: staff.name };
        });

        if (staves.length) {
            rows.push({
                type: "select",
                slug: "staff",
                label: "PF2E.Weapon.Base.staff",
                options: staves,
            });
        }

        if (hasStaffNexus || isRunelord) {
            const options: string[] = [];

            if (isRunelord) {
                options.push("bond");

                if (staves.length) {
                    if (hasStaffNexus) {
                        options.push("mergedshift");
                    }

                    options.push("merged");
                }
            } else {
                options.push("makeshift", "regular");
            }

            const typeRow = {
                type: "select",
                slug: "type",
                label: i18n("type"),
                options: options.map((value) => {
                    return { value, label: i18n(value) };
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
        const flexibleLabel = i18n("flexible");
        const emptyLabel = i18n("empty");
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
            })
        );

        return rows;
    },
    process: async ({ actor, rows, custom, messages, updateItem, setExtraFlags }) => {
        const sin = custom.runelordSin;
        const bond = sin ? actor.inventory.get(rows.bond) : null;
        const staff = !sin || rows.type !== "bond" ? actor.inventory.get(rows.staff) : null;
        if (!custom.entries || (!staff && !bond)) return;

        const maxCharges = custom.maxCharges;
        const sinSpells = await getSpells(sin, maxCharges);
        const staffSpells = await getSpells(staff, maxCharges);
        if (!sinSpells.length && !staffSpells.length) return;

        let overcharge = 0;
        const spellcasting = actor.spellcasting!;
        const preparedEntries = custom.preparedEntries;
        const flexibleLabel = i18n("flexible");
        const emptyLabel = i18n("empty");
        const expendedSpells: { name: string; rank: ZeroToTen; uuid?: string }[] = [];
        const slotsUpdates: Record<string, Record<string, number>> = {};

        const expendedRows = R.pipe(
            rows,
            R.omit(["staff", "type", "bond"]),
            R.values(),
            R.filter(R.isTruthy)
        );

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

        const charges =
            (rows.type === "makeshift" ? 0 : maxCharges * (rows.type === "merged" ? 2 : 1)) +
            overcharge;

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
                actor.synthetics.statistics.get("impulse") ??
                actor.synthetics.statistics.get("kinetic-activation");

            if (statistic) {
                staffData.statistic = { slug: statistic.slug, tradition: "primal" };
            }
        }

        setExtraFlags(staffData);

        const staffType = i18n(
            ["mergedshift", "makeshift"].includes(rows.type) ? "makeshift" : "staff"
        ).toLocaleLowerCase();

        const groupLabel = ["mergedshift", "merged"].includes(rows.type)
            ? "merged"
            : rows.type === "bond"
            ? "bond"
            : "prepared";

        messages.addGroup("staff", i18n("group", groupLabel, { type: staffType }), 45);

        if (bond) {
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

interface StaffSpellcastingConstructorParams<TActor extends CreaturePF2e> {
    id: string;
    name: string;
    actor: TActor;
    statistic: Statistic;
    tradition?: Maybe<MagicTradition>;
    castPredicate: PredicateStatement[];
}

class StaffSpellcasting implements SpellcastingEntryWithCharges<CharacterPF2e> {
    id: string;
    name: string;
    actor: CharacterPF2e;
    statistic: Statistic;
    tradition: MagicTradition | null;
    castPredicate: Predicate;
    staff: dailies.StaffPF2e;

    constructor(
        {
            id,
            name,
            actor,
            statistic,
            tradition,
            castPredicate,
        }: StaffSpellcastingConstructorParams<CharacterPF2e>,
        staff: dailies.StaffPF2e
    ) {
        this.id = id;
        this.name = name;
        this.actor = actor;
        this.statistic = statistic;
        this.tradition = tradition ?? null;
        this.castPredicate = new game.pf2e.Predicate(castPredicate);
        this.staff = staff;
    }

    get counteraction(): Statistic {
        return createCounteractStatistic(this);
    }

    get attribute(): AttributeString {
        return this.statistic.attribute ?? "cha";
    }

    get category(): "charges" {
        return "charges";
    }

    get sort(): number {
        return Math.max(0, ...this.actor.itemTypes.spellcastingEntry.map((e) => e.sort)) + 10;
    }

    get spells(): null {
        return null;
    }

    get isFlexible(): false {
        return false;
    }

    get isFocusPool(): false {
        return false;
    }

    get isInnate(): false {
        return false;
    }

    get isPrepared(): false {
        return false;
    }

    get isSpontaneous(): false {
        return false;
    }

    get isRitual(): false {
        return false;
    }

    get isEphemeral(): true {
        return true;
    }

    canCast(spell: SpellPF2e): boolean {
        if (this.actor !== spell.actor) {
            return false;
        }

        const rollOptions = new Set([
            ...this.staff.getRollOptions("item"),
            ...spell.getRollOptions("spell", { includeVariants: true }),
        ]);

        return this.castPredicate.test(rollOptions);
    }

    async cast(
        spell: SpellPF2e,
        options: CastOptions & { spontaneous?: { entryId: string; rank?: OneToFour } } = {}
    ): Promise<void> {
        const actor = this.actor;
        const castRank = spell.rank;
        const canCast = spell.isCantrip || canCastRank(actor, castRank);
        const staffFlags = getStaffFlags(this.actor);

        if (!staffFlags || canCast === null) {
            error("staves.error.missing");
            return;
        }

        const staff = actor.inventory.get(staffFlags.staffId)!;

        if (!staff.isEquipped) {
            warn("staves.error.notEquipped", { staff: staff.name });
            return;
        }

        if (!canCast) {
            warn("charges.error.notEnough", {
                spell: spell.name,
                rank: getRankLabel(castRank),
            });
            return;
        }

        if (!staffFlags || options.message === false || !this.canCast(spell)) {
            return;
        }

        if (spell.isCantrip) {
            spell.toMessage(null, {
                rollMode: options.rollMode,
                data: { castRank: spell.rank },
            });
            return;
        }

        let charges = staffFlags.charges.value;
        let mustUseSpontaneous = charges < castRank;
        let useSpontaneous: null | false | { entry: string; slot: SlotKey } = false;

        if (!staffFlags.expended) {
            const minRank = Math.min(options.spontaneous?.rank ?? castRank, castRank);
            const maxRank = getActorMaxRank(actor);
            const range = R.range(minRank, maxRank + 1) as OneToTen[];
            const entries = R.pipe(
                actor.spellcasting.filter(
                    (entry): entry is SpellcastingEntryPF2e<CharacterPF2e> =>
                        entry.category === "spontaneous" &&
                        (!options.spontaneous || options.spontaneous.entryId === entry.id)
                ),
                R.map((e) => ({
                    id: e.id,
                    name: e.name,
                    slots: R.pipe(
                        range,
                        R.filter((r) => {
                            const slot = e.system.slots[`slot${r}`];
                            return slot.max > 0 && slot.value > 0;
                        }),
                        R.map((r) => {
                            const key = `slot${r}` as SlotKey;
                            return {
                                key,
                                rank: getRankLabel(r),
                                value: e.system.slots[key].value,
                            };
                        })
                    ),
                })),
                R.filter((e) => e.slots.length > 0)
            );

            if (entries.length && options.spontaneous) {
                useSpontaneous = {
                    entry: entries[0].id,
                    slot: entries[0].slots[0].key,
                };
            } else if (entries.length) {
                const localize = subLocalize("staves.spontaneous");
                const multiEntries = entries.length > 1;
                const hint = localize(mustUseSpontaneous ? "must" : "would", {
                    rank: getRankLabel(castRank),
                    higher: entries.some((e) => e.slots.length > 1) ? localize("higher") : "",
                    from: localize(multiEntries ? "multi" : "one", {
                        entry: entries[0].name,
                    }),
                });

                useSpontaneous = await waitDialog({
                    title: localize("title"),
                    content: "spontaneous",
                    classes: ["pf2e-dailies-spontaneous"],
                    yes: {
                        label: game.i18n.localize("Yes"),
                        callback: async (event, btn, html) => {
                            const el = htmlQuery(html, "[name=entry]:checked")!;
                            return elementDataset(el) as { entry: string; slot: SlotKey };
                        },
                    },
                    no: {
                        label: game.i18n.localize(mustUseSpontaneous ? "Cancel" : "No"),
                        default: true,
                    },
                    data: {
                        hint,
                        entries,
                        multiEntries,
                        i18n: localize.i18n,
                    },
                });

                if (useSpontaneous === null) return;
            }

            if (useSpontaneous) {
                charges = getStaffFlags(actor)?.charges.value ?? 0;
                mustUseSpontaneous = charges < castRank;
            }
        }

        const spontaneousValue = useSpontaneous
            ? actor.spellcasting.get(useSpontaneous.entry)?.system?.slots[useSpontaneous.slot].value
            : undefined;

        if (charges < 1 || (mustUseSpontaneous && !spontaneousValue)) {
            return;
        }

        if (spontaneousValue && useSpontaneous) {
            await actor.updateEmbeddedDocuments("Item", [
                {
                    _id: useSpontaneous.entry,
                    [`system.slots.${useSpontaneous.slot}.value`]: spontaneousValue - 1,
                },
            ]);
        }

        await setStaffChargesValue(actor, spontaneousValue ? charges - 1 : charges - castRank);

        spell.toMessage(null, {
            rollMode: options.rollMode,
            data: { castRank: spell.rank },
        });
    }

    async getSheetData({ spells }: { spells?: SpellCollection<CharacterPF2e> } = {}) {
        const actor = this.actor;

        if (!actor?.isOfType("character", "npc")) {
            throw ErrorPF2e("Spellcasting entries can only exist on characters and npcs");
        }

        const maxCantripRank = Math.max(1, Math.ceil(actor.level / 2)) as OneToTen;
        const groups = R.pipe(
            Array.from(spells?.values() ?? []),
            R.groupBy((s) => (s.isCantrip ? 0 : s.rank)),
            R.entries(),
            R.sortBy((x) => x[0]),
            R.map(([_rank, spells]): SpellcastingSlotGroup => {
                const rank = Number(_rank) as ZeroToTen;
                return {
                    id: rank === 0 ? "cantrips" : rank,
                    label:
                        rank === 0
                            ? "PF2E.Actor.Creature.Spellcasting.Cantrips"
                            : getRankLabel(rank),
                    maxRank: rank === 0 ? maxCantripRank : rank,
                    number: rank,
                    active: spells.map((spell) => ({
                        spell,
                        expended: !canCastRank(actor, rank),
                    })),
                };
            })
        );

        return {
            ...R.pick(this, [
                "category",
                "tradition",
                "sort",
                "isFlexible",
                "isFocusPool",
                "isInnate",
                "isPrepared",
                "isRitual",
                "isSpontaneous",
                "isEphemeral",
            ]),
            groups,
            prepList: null,
            id: spells?.id ?? this.id,
            name: spells?.name ?? this.name,
            statistic: this.statistic.getChatData(),
            attribute: this.statistic.attribute,
            hasCollection: !!spells?.size,
            usesSpellProficiency: false,
            isCharges: true,
            isStaff: true,
            uses: getStaffFlags(actor)?.charges ?? { value: 0, max: 0 },
        } satisfies ChargesSpellcastingSheetData;
    }
}

function isStaff(item: ItemPF2e) {
    const trait = item.isOfType("weapon") ? "magical" : "coda";
    const traits = item.system.traits?.value;
    return traits?.includes("staff") && traits.includes(trait);
}

function getStaves<TActor extends CharacterPF2e | NPCPF2e>(actor: TActor): ActorStaff<TActor>[] {
    return [
        ...actor.itemTypes.weapon.filter(isStaff),
        ...actor.itemTypes.equipment.filter(isStaff),
    ] as ActorStaff<TActor>[];
}

function getRunelordSin(actor: CharacterPF2e) {
    return getItemWithSourceId(actor, RUNELORD_SINS, "feat");
}

function getPotentialBonds(actor: CharacterPF2e) {
    return actor.itemTypes.weapon.filter((weapon) => !isStaff(weapon));
}

async function getSpells(
    item: Maybe<ItemPF2e>,
    maxCharges: number,
    entryId: string | null = null
): Promise<SpellSource[]> {
    if (!item) return [];

    const descriptionEl = createHTMLElement("div", { innerHTML: item.description });
    const spellLists = descriptionEl.querySelectorAll("ul");
    const spellList = spellLists[spellLists.length - 1];
    if (!spellList) return [];

    const spellsData = getSpellsDataFromItemDescription(item, maxCharges);
    const spells = await Promise.all(
        spellsData.map(async ({ rank, uuid }) => {
            const spell = await fromUuid(uuid);
            if (!isInstanceOf(spell, "SpellPF2e")) return;

            return foundry.utils.mergeObject(
                spell._source,
                {
                    _id: foundry.utils.randomID(),
                    system: { location: { value: entryId, heightenedLevel: rank } },
                },
                { inplace: false }
            );
        })
    );

    return R.filter(spells, R.isTruthy);
}

function getSpellsDataFromItemDescription(
    item: ItemPF2e,
    maxRank: number = Infinity
): { rank: ZeroToTen; uuid: string }[] {
    const descriptionEl = createHTMLElement("div", { innerHTML: item.description });
    const spellLists = descriptionEl.querySelectorAll("ul");
    const spellList = spellLists[spellLists.length - 1];
    if (!spellList) return [];

    return R.pipe(
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
}

interface StaffSpellcasting {
    system: SpellcastingEntrySystemData;
}

type ActorStaff<TActor extends CharacterPF2e | NPCPF2e = CharacterPF2e | NPCPF2e> =
    | EquipmentPF2e<TActor>
    | WeaponPF2e<TActor>;

type FlexiblePreparedEntryGroup = {
    id: string;
    name: string;
    slots: {
        rank: ZeroToTen;
        value: number;
        max: number;
    }[];
};

type PreparedEntryGroup = {
    id: string;
    name: string;
    spells: {
        name?: string;
        rank: ZeroToTen;
        index: number;
    }[];
};

export { getSpells, getStaves, StaffSpellcasting, staves };
export type { ActorStaff };
