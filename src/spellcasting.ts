import {
    ActorPF2e,
    CharacterPF2e,
    CreateSpellcastingSource,
    createSpellcastingSource,
    CreaturePF2e,
    isInstanceOf,
    ItemSystemData,
    localize,
    MODULE,
    NPCPF2e,
    OneToTen,
    R,
    SlotKey,
    SpellcastingCategory,
    SpellcastingEntry,
    SpellcastingEntryPF2e,
    SpellcastingEntrySystemSource,
    SpellcastingSheetData,
    SpellCollection,
    SpellPF2e,
    SpellSlotGroupId,
    spellSlotGroupIdToNumber,
    ValueAndMax,
    warnInvalidDrop,
    ZeroToTen,
} from "foundry-helpers";
import { getSpellRankLabel } from "foundry-helpers/dist";

function createSpellcastingWithHighestStatisticSource(
    actor: NPCPF2e | CharacterPF2e,
    { name, category, flags, showSlotlessRanks, sort, withClassDcs }: CreateSpellcastingSourceWithHighestStatistic,
) {
    const highestEntry = getHighestSpellcastingStatistic(actor);
    const highestSynthetic = getHighestSyntheticStatistic(actor, withClassDcs);

    const [tradition, statistic] =
        highestEntry && (!highestSynthetic || highestEntry.statistic.mod >= highestSynthetic.mod)
            ? [highestEntry.tradition, highestEntry.statistic]
            : highestSynthetic
              ? [null, highestSynthetic]
              : [null, null];

    if (!statistic) return;

    return createSpellcastingSource({
        name,
        sort,
        flags,
        category,
        showSlotlessRanks,
        tradition: tradition ?? "arcane",
        attribute: statistic.attribute,
        proficiencyRank: statistic.rank ?? 1,
        proficiencySlug: statistic === highestSynthetic ? statistic.slug : undefined,
    });
}

function getSpellcastingMaxRank(entry: SpellcastingEntryPF2e, rankLimit: OneToTen = 10) {
    const slots = entry.system.slots;
    const limit = Math.clamp(rankLimit, 1, 10) as OneToTen;

    let maxRank = 0;

    for (let rank = 1; rank <= limit; rank++) {
        const slotKey = `slot${rank}` as SlotKey;
        const slot = slots[slotKey];

        if (slot.max > 0) {
            maxRank = rank;
        }
    }

    return maxRank as ZeroToTen;
}

function getHighestSyntheticStatistic(actor: NPCPF2e | CharacterPF2e, withClassDcs = true) {
    const isCharacter = actor.isOfType("character");
    const synthetics = Array.from(actor.synthetics.statistics.values());
    const statistics = withClassDcs && isCharacter ? [...synthetics, ...Object.values(actor.classDCs)] : synthetics;

    if (!statistics.length) return;

    const classStatistic = isCharacter ? actor.classDC : null;
    const groupedStatistics = R.groupBy(statistics, R.prop("mod"));
    const highestMod = R.pipe(R.keys(groupedStatistics), R.firstBy([R.identity(), "desc"])) as unknown as number;

    if (classStatistic && highestMod && classStatistic.mod === highestMod) {
        return classStatistic;
    }

    return groupedStatistics[highestMod][0];
}

function getHighestSpellcastingStatistic(actor: NPCPF2e | CharacterPF2e) {
    const entries = (actor as CreaturePF2e).spellcasting?.spellcastingFeatures;
    if (!entries?.length) return;

    const classAttribute = actor.isOfType("character") ? actor.classDC?.attribute : null;
    const groupedEntries = R.groupBy(entries, (entry) => entry.statistic.mod);

    const highestMod = R.pipe(groupedEntries, R.keys(), R.sortBy([(x) => Number(x), "desc"]), R.first());

    const highestResults = groupedEntries[Number(highestMod)].map((entry) => ({
        tradition: entry.tradition,
        statistic: entry.statistic,
    }));

    if (highestResults.length === 1 || !classAttribute) {
        return highestResults[0];
    }

    return highestResults.find((entry) => entry.statistic.attribute === classAttribute) || highestResults[0];
}

function spellcastingEntryPrepareSiblingData(
    this: SpellcastingEntryPF2eWithCharges<CreaturePF2e>,
    wrapped: libWrapper.RegisterCallback,
): void {
    const actor = this.actor;

    if (!actor.isOfType("creature") || !actor.spellcasting || this.system.prepared.value !== "charges") {
        wrapped();
        return;
    }

    try {
        const SpellCollectionCls = actor.spellcasting.get("rituals")!.spells!.constructor as unknown as {
            prototype: SpellCollection<CreaturePF2e>;
            new (entry: SpellcastingEntryPF2eWithCharges, name?: string): SpellCollection<CreaturePF2e>;
        };

        class ChargesSpellCollection extends SpellCollectionCls {
            async addSpell(
                spell: SpellPF2e<ActorPF2e>,
                options?: { groupId?: Maybe<SpellSlotGroupId> } | undefined,
            ): Promise<SpellPF2e<CreaturePF2e> | null> {
                const actor = this.actor;
                const groupId = options?.groupId;
                const heightenedRank = spellSlotGroupIdToNumber(groupId) ?? spell.rank;

                const spellcastingEntryId = spell.system.location.value;
                if (spellcastingEntryId === this.id && spell.rank === heightenedRank) {
                    return null;
                }

                if (spell.isFocusSpell) {
                    warnInvalidDrop("invalid-spell", { spell });
                    return null;
                }

                if (spell.baseRank > heightenedRank && this.id === spell.system.location?.value) {
                    warnInvalidDrop("invalid-rank", { spell, groupId });
                    return null;
                }

                const heightenedUpdate =
                    heightenedRank >= spell.baseRank ? { "system.location.heightenedLevel": heightenedRank } : {};

                if (spell.actor === actor) {
                    return spell.update({
                        "system.location.value": this.id,
                        ...heightenedUpdate,
                    }) as Promise<SpellPF2e<CreaturePF2e> | null>;
                } else {
                    const source = spell
                        .clone({ sort: 0, "system.location.value": this.id, ...heightenedUpdate })
                        .toObject();
                    const created = (await actor.createEmbeddedDocuments("Item", [source])).shift();

                    return isInstanceOf<SpellPF2e<CreaturePF2e>>(created, "SpellPF2e") ? created : null;
                }
            }

            async getSpellData(options?: { prepList?: boolean }) {
                const spellData = await super.getSpellData(options);
                const charges = this.entry.system?.slots.slot1.value || 0;

                for (const group of spellData.groups) {
                    if (group.id === "cantrips" || charges >= group.id) continue;

                    for (const active of group.active) {
                        if (!active) continue;
                        active.expended = true;
                    }
                }

                return spellData;
            }
        }

        this.spells = new ChargesSpellCollection(this);

        const spells = actor.itemTypes.spell.filter((spell) => spell.system.location.value === this.id);

        for (const spell of spells) {
            this.spells.set(spell.id, spell);
        }

        actor.spellcasting.collections.set(this.spells.id, this.spells);
    } catch (error: any) {
        MODULE.error("SpPellcastingEntryPF2e#prepareSiblingData", error);
    }
}

async function spellcastingEntryConsume(
    this: SpellcastingEntryPF2eWithCharges<NonNullable<CreaturePF2e>>,
    wrapped: libWrapper.RegisterCallback,
    spell: SpellPF2e<ActorPF2e>,
    rank: ZeroToTen,
    slotIndex?: number,
): Promise<boolean> {
    const actor = this.actor;

    if (!actor.isOfType("npc", "character") || !actor.spellcasting || this.system.prepared.value !== "charges") {
        return wrapped(spell, rank, slotIndex);
    }

    try {
        const charges = this.system.slots.slot1.value;

        if (charges < rank) {
            localize.warning("charges.error.notEnough", {
                spell: spell.name,
                rank: getSpellRankLabel(rank),
            });
            return false;
        }

        await this.update({ "system.slots.slot1.value": charges - rank });
        return true;
    } catch (error: any) {
        MODULE.error("SpPellcastingEntryPF2e#consume", error);
        return false;
    }
}

async function spellcastingEntryGetSheetData(
    this: SpellcastingEntryPF2eWithCharges<NonNullable<CreaturePF2e>>,
    wrapped: libWrapper.RegisterCallback,
    options: { spells?: SpellCollection<CharacterPF2e> } = {},
): Promise<ChargesSpellcastingSheetData> {
    const actor = this.actor;
    const data: ChargesSpellcastingSheetData = await wrapped(options);

    if (!actor.isOfType("npc", "character") || !actor.spellcasting || this.system.prepared.value !== "charges") {
        return data;
    }

    data.isCharges = true;
    data.isStaff = false;
    data.uses = {
        value: this.system.slots.slot1.value,
        max: this.system.slots.slot1.max,
    };

    return data;
}

type WithCharges = {
    category: SpellcastingCategory | "charges";
    isStaff?: boolean;
    uses?: ValueAndMax;
};

type SpellcastingEntryPF2eWithCharges<TParent extends ActorPF2e | null = ActorPF2e | null> = Omit<
    SpellcastingEntryPF2e<TParent>,
    "system" | "category"
> &
    WithCharges & {
        system: Omit<SpellcastingEntrySystemSource, "description" | "prepared"> &
            Omit<ItemSystemData, "level" | "traits"> & {
                prepared: {
                    value: SpellcastingCategory | "charges";
                    flexible: boolean;
                    validItems: "scroll" | null;
                };
            };
    };

type CreateSpellcastingSourceWithHighestStatistic = Omit<
    CreateSpellcastingSource,
    "attribute" | "proficiencyRank" | "proficiencySlug" | "tradition"
> & {
    withClassDcs?: boolean;
};

type SpellcastingSheetDataWithCharges = Omit<SpellcastingSheetData, "category"> & WithCharges;

type ChargesSpellcastingSheetData = SpellcastingSheetDataWithCharges & {
    isStaff: boolean;
    isCharges: boolean;
    uses: { value: number; max: number };
};

type SpellcastingEntryWithCharges<TActor extends ActorPF2e> = Omit<
    SpellcastingEntry<TActor>,
    "category" | "getSheetData"
> &
    WithCharges & {
        getSheetData(options?: {
            spells?: SpellCollection<TActor>;
            prepList?: boolean;
        }): Promise<SpellcastingSheetDataWithCharges>;
    };

export {
    createSpellcastingWithHighestStatisticSource,
    getHighestSpellcastingStatistic,
    getSpellcastingMaxRank,
    spellcastingEntryConsume,
    spellcastingEntryGetSheetData,
    spellcastingEntryPrepareSiblingData,
};
export type { ChargesSpellcastingSheetData, SpellcastingEntryPF2eWithCharges, SpellcastingEntryWithCharges };
