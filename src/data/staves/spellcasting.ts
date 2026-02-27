import {
    AttributeString,
    CastOptions,
    CharacterPF2e,
    CreaturePF2e,
    ErrorPF2e,
    getActorMaxRank,
    getSpellRankLabel,
    htmlQuery,
    localize,
    MagicTradition,
    OneToFour,
    OneToTen,
    Predicate,
    PredicateStatement,
    R,
    SlotKey,
    SpellcastingEntryPF2e,
    SpellcastingSlotGroup,
    SpellCollection,
    SpellPF2e,
    Statistic,
    waitDialog,
    ZeroToTen,
} from "foundry-helpers";
import { ChargesSpellcastingSheetData, SpellcastingEntryWithCharges } from "spellcasting";
import { canCastRank, getStaffData, setStaffChargesValue } from ".";

class StaffSpellcasting implements SpellcastingEntryWithCharges<CharacterPF2e> {
    id: string;
    name: string;
    actor: CharacterPF2e;
    statistic: Statistic;
    tradition: MagicTradition | null;
    castPredicate: Predicate;
    staff: dailies.StaffPF2e;

    constructor(
        { id, name, actor, statistic, tradition, castPredicate }: StaffSpellcastingConstructorParams<CharacterPF2e>,
        staff: dailies.StaffPF2e,
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
        options: CastOptions & { spontaneous?: { entryId: string; rank?: OneToFour } } = {},
    ): Promise<void> {
        const actor = this.actor;
        const castRank = spell.rank;
        const canCast = spell.isCantrip || canCastRank(actor, castRank);
        const staffFlags = getStaffData(this.actor);

        if (!staffFlags || canCast === null) {
            localize.error("staves.error.missing");
            return;
        }

        const staff = actor.inventory.get(staffFlags.staffId)!;

        if (!staff.isEquipped) {
            localize.warning("staves.error.notEquipped", { staff: staff.name });
            return;
        }

        if (!canCast) {
            localize.warning("charges.error.notEnough", {
                spell: spell.name,
                rank: getSpellRankLabel(castRank),
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
                        (!options.spontaneous || options.spontaneous.entryId === entry.id),
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
                                rank: getSpellRankLabel(r),
                                value: e.system.slots[key].value,
                            };
                        }),
                    ),
                })),
                R.filter((e) => e.slots.length > 0),
            );

            if (entries.length && options.spontaneous) {
                useSpontaneous = {
                    entry: entries[0].id,
                    slot: entries[0].slots[0].key,
                };
            } else if (entries.length) {
                const multiEntries = entries.length > 1;
                const hint = localize("staves.spontaneous", mustUseSpontaneous ? "must" : "would", {
                    rank: getSpellRankLabel(castRank),
                    higher: entries.some((e) => e.slots.length > 1) ? localize("staves.spontaneous.higher") : "",
                    from: localize("staves.spontaneous", multiEntries ? "multi" : "one", {
                        entry: entries[0].name,
                    }),
                });

                useSpontaneous = await waitDialog<{ entry: string; slot: SlotKey }>({
                    content: "staves/spontaneous",
                    classes: ["pf2e-dailies-spontaneous"],
                    i18n: "staves.spontaneous",
                    data: {
                        hint,
                        entries,
                        multiEntries,
                    },
                    position: {
                        width: 500,
                    },
                    yes: {
                        callback: async (_event, _btn, dialog) => {
                            const selected = htmlQuery(dialog.element, "[name=entry]:checked");
                            return selected?.dataset;
                        },
                    },
                });

                if (useSpontaneous === null) return;
            }

            if (useSpontaneous) {
                charges = getStaffData(actor)?.charges.value ?? 0;
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
                    label: rank === 0 ? "PF2E.Actor.Creature.Spellcasting.Cantrips" : getSpellRankLabel(rank),
                    maxRank: rank === 0 ? maxCantripRank : rank,
                    number: rank,
                    active: spells.map((spell) => ({
                        spell,
                        expended: !canCastRank(actor, rank),
                    })),
                };
            }),
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
            uses: getStaffData(actor)?.charges ?? { value: 0, max: 0 },
        } satisfies ChargesSpellcastingSheetData;
    }
}

/**
 * https://github.com/foundryvtt/pf2e/blob/49dc6d70c7e7bb26d8039c97361e638bdef6a3bd/src/module/item/spellcasting-entry/helpers.ts#L10
 */
function createCounteractStatistic<TActor extends CreaturePF2e>(
    ability: SpellcastingEntryWithCharges<TActor>,
): Statistic<TActor> {
    const actor = ability.actor;

    // NPCs have neither a proficiency bonus nor specified attribute modifier: use their base attack roll modifier
    const baseModifier = actor.isOfType("npc")
        ? ability.statistic.check.modifiers.find((m) => m.type === "untyped" && m.slug === "base")?.clone()
        : null;

    const StatisticCls = actor.skills.acrobatics.constructor as typeof Statistic;
    return new StatisticCls(actor, {
        slug: "counteract",
        label: "PF2E.Item.Spell.Counteract.Label",
        attribute: ability.statistic.attribute,
        rank: ability.statistic.rank || 1,
        check: { type: "check", modifiers: [baseModifier].filter(R.isTruthy) },
    });
}

interface StaffSpellcastingConstructorParams<TActor extends CreaturePF2e> {
    id: string;
    name: string;
    actor: TActor;
    statistic: Statistic;
    tradition?: Maybe<MagicTradition>;
    castPredicate: PredicateStatement[];
}

export { StaffSpellcasting };
