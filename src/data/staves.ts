import {
    ErrorPF2e,
    R,
    createCounteractStatistic,
    createHTMLElement,
    elementDataset,
    error,
    getActorMaxRank,
    getRankLabel,
    hasItemWithSourceId,
    htmlQuery,
    htmlQueryAll,
    localize,
    render,
    subLocalize,
    waitDialog,
    warn,
} from "foundry-pf2e";
import { canCastRank, getStaffFlags, setStaffChargesValue } from "../api";
import { createDaily } from "../daily";
import {
    ChargesSpellcastingSheetData,
    DailyRowSelectOption,
    DailyRowSelectOptionValue,
} from "../types";
import { utils } from "../utils";

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

const KINETIC_ACTIVATION = "Compendium.pf2e.feats-srd.Item.NV9H39kbkbjhAK6X";
const STAFF_NEXUS = "Compendium.pf2e.classfeatures.Item.Klb35AwlkNrq1gpB";

const UUID_REGEX = /@(uuid|compendium)\[([a-z0-9\._-]+)\]/gi;
const LABEL_REGEX = /\d+/;

function isStaff(item: ItemPF2e) {
    const trait = item.isOfType("weapon") ? "magical" : "coda";
    const traits = item.system.traits?.value;
    return traits?.includes("staff") && traits.includes(trait);
}

function getStaves(actor: CharacterPF2e) {
    return [
        ...actor.itemTypes.weapon.filter(isStaff),
        ...actor.itemTypes.equipment.filter(isStaff),
    ];
}

function hasStaves(actor: CharacterPF2e) {
    return actor.itemTypes.weapon.some(isStaff) || actor.itemTypes.equipment.some(isStaff);
}

const staves = createDaily({
    key: "staves",
    condition: (actor) => hasStaves(actor),
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
            maxCharges =
                R.pipe(
                    entries,
                    R.map((entry) => entry.highestRank),
                    R.firstBy([R.identity(), "desc"])
                ) ?? 0;
        }

        if (maxCharges > actorCharges) {
            maxCharges = actorCharges;
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

        return { entries, maxCharges, preparedEntries, activationType };
    },
    rows: (actor, items, custom) => {
        if (!custom.entries) {
            return [];
        }

        const staves = getStaves(actor).map((staff) => ({
            value: staff.id,
            label: staff.name,
        }));

        const staffRow = {
            type: "select",
            slug: "staff",
            label: "PF2E.Weapon.Base.staff",
            options: staves,
        } as const;

        const preparedEntries = Object.values(custom.preparedEntries);

        if (!preparedEntries.length) {
            return [staffRow];
        }

        const level = actor.level;
        const hasStaffNexus = level >= 8 && hasItemWithSourceId(actor, STAFF_NEXUS, "feat");
        const options: DailyRowSelectOption[] = [{ value: "", label: "" }];
        const flexibleLabel = localize("interface.staves.flexible");
        const emptyLabel = localize("interface.staves.empty");
        const nbExpends = hasStaffNexus ? (level >= 16 ? 3 : 2) : 1;

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
        const rows = R.range(1, nbExpends + 1).map((i) => {
            return {
                type: "select",
                slug: `expend${i}`,
                save: false,
                empty: true,
                label: localize("label.expend", { nb: i }),
                unique: uniqueId,
                options,
            } as const;
        });

        // @ts-ignore
        rows.unshift(staffRow);

        return rows;
    },
    process: async ({ actor, rows, custom, messages, updateItem, setExtraFlags }) => {
        const staff = actor.inventory.get(rows.staff);
        if (!custom.entries || !staff) return;

        const descriptionEl = createHTMLElement("div", { innerHTML: staff.description });
        const spellList = descriptionEl.querySelectorAll("ul");
        if (!spellList.length) return;

        const spellRanksList = htmlQueryAll(spellList[spellList.length - 1], "li");
        const staffSpellData = R.pipe(
            spellRanksList,
            R.flatMap((SpellRankEL) => {
                const label = SpellRankEL.firstChild as HTMLElement;
                const rank = Number(label.textContent?.match(LABEL_REGEX)?.[0] || "0") as ZeroToTen;
                const uuids = Array.from(SpellRankEL.textContent!.matchAll(UUID_REGEX)).map(
                    (match) => (match[1] === "Compendium" ? `Compendium.${match[2]}` : match[2])
                );
                return uuids.map((uuid) => ({ rank, uuid }));
            }),
            R.filter(({ rank }) => rank <= custom.maxCharges)
        );

        const staffSpells = R.filter(
            await Promise.all(
                staffSpellData.map(async ({ rank, uuid }) => {
                    const spell = await fromUuid<SpellPF2e>(uuid);
                    if (!spell?.isOfType("spell")) return;

                    return foundry.utils.mergeObject(
                        spell._source,
                        {
                            _id: foundry.utils.randomID(),
                            system: { location: { value: null, heightenedLevel: rank } },
                        },
                        { inplace: false }
                    );
                })
            ),
            R.isTruthy
        );

        if (!staffSpells.length) return;

        let overcharge = 0;
        const spellcasting = actor.spellcasting!;
        const preparedEntries = custom.preparedEntries;
        const flexibleLabel = localize("interface.staves.flexible");
        const emptyLabel = localize("interface.staves.empty");
        const expendedSpells: { name: string; rank: ZeroToTen; uuid?: string }[] = [];
        const slotsUpdates: Record<string, Record<string, number>> = {};
        const expendedRows = R.pipe(rows, R.omit(["staff"]), R.values(), R.filter(R.isTruthy));

        for (const preparedPath of expendedRows) {
            const entryId = preparedPath?.split(".")[0];
            const entry = spellcasting.get<SpellcastingEntryPF2e<CharacterPF2e>>(entryId);
            const preparedData = foundry.utils.getProperty<
                FlexiblePreparedEntryGroup["slots"][number] | PreparedEntryGroup["spells"][number]
            >(preparedEntries, preparedPath);

            if (!entry || !preparedData) continue;

            const rank = preparedData.rank;
            const slot = entry._source.system.slots[`slot${rank}`];

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
                const prepared = foundry.utils.deepClone(slot.prepared);
                const preparedSlot = prepared[preparedData.index];

                if (slot.max < 1 || preparedSlot.expended) continue;

                overcharge += rank;
                preparedSlot.expended = true;

                updateItem({
                    _id: entryId,
                    [`system.slots.slot${rank}.prepared`]: prepared,
                });

                const spell = preparedSlot.id ? actor.items.get(preparedSlot.id) : undefined;

                expendedSpells.push({
                    uuid: spell?.uuid,
                    name: spell?.name ?? emptyLabel,
                    rank,
                });
            }
        }

        const staffData: dailies.StaffFlags = {
            staffId: staff.id,
            charges: {
                value: custom.maxCharges + overcharge,
                max: custom.maxCharges + overcharge,
            },
            expended: expendedSpells.length > 0,
            spells: staffSpells,
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

        setExtraFlags({ staffData });

        messages.addGroup("staff", undefined, 45);
        messages.add("staff", { uuid: staff.uuid });

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

class StaffSpellcasting implements SpellcastingEntry<CharacterPF2e> {
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
                        entry.isSpontaneous &&
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

                const callback = (html: JQuery) => {
                    const el = htmlQuery<HTMLInputElement>(html[0], "[name=entry]:checked");
                    return elementDataset(el!) as { entry: string; slot: SlotKey };
                };

                useSpontaneous = await waitDialog({
                    title: localize("title"),
                    template: "spontaneous",
                    default: "no",
                    yes: {
                        label: game.i18n.localize("Yes"),
                        callback,
                    },
                    no: {
                        label: game.i18n.localize(mustUseSpontaneous ? "Cancel" : "No"),
                        callback: () => false,
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
            ? actor.spellcasting.get<SpellcastingEntryPF2e<CharacterPF2e>>(useSpontaneous.entry)
                  ?.system.slots[useSpontaneous.slot].value
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

    async getSheetData({
        spells,
    }: { spells?: SpellCollection<CharacterPF2e> } = {}): Promise<ChargesSpellcastingSheetData> {
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
        };
    }
}

interface StaffSpellcasting {
    system: SpellcastingEntrySystemData;
}

export { StaffSpellcasting, hasStaves, staves };
