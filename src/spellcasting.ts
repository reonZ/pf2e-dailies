import {
    ActorPF2e,
    CharacterPF2e,
    CreaturePF2e,
    getRankLabel,
    getSpellCollectionClass,
    isInstanceOf,
    MODULE,
    SpellcastingEntryPF2eWithCharges,
    SpellCollection,
    SpellPF2e,
    SpellSlotGroupId,
    spellSlotGroupIdToNumber,
    warn,
    warnInvalidDrop,
    ZeroToTen,
} from "module-helpers";
import { ChargesSpellcastingSheetData } from "./types";

function spellcastingEntryPrepareSiblingData(
    this: SpellcastingEntryPF2eWithCharges<CreaturePF2e>,
    wrapped: libWrapper.RegisterCallback
): void {
    const actor = this.actor;

    if (
        !actor.isOfType("creature") ||
        !actor.spellcasting ||
        this.system.prepared.value !== "charges"
    ) {
        wrapped();
        return;
    }

    try {
        const SpellCollectionCls = getSpellCollectionClass(actor) as unknown as {
            prototype: SpellCollection<CreaturePF2e>;
            new (
                entry: SpellcastingEntryPF2eWithCharges,
                name?: string
            ): SpellCollection<CreaturePF2e>;
        };

        class ChargesSpellCollection extends SpellCollectionCls {
            async addSpell(
                spell: SpellPF2e<ActorPF2e>,
                options?: { groupId?: Maybe<SpellSlotGroupId> } | undefined
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
                    heightenedRank >= spell.baseRank
                        ? { "system.location.heightenedLevel": heightenedRank }
                        : {};

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

                    return isInstanceOf<SpellPF2e<CreaturePF2e>>(created, "SpellPF2e")
                        ? created
                        : null;
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

        const spells = actor.itemTypes.spell.filter(
            (spell) => spell.system.location.value === this.id
        );

        for (const spell of spells) {
            this.spells.set(spell.id, spell);
        }

        actor.spellcasting.collections.set(this.spells.id, this.spells);
    } catch (error) {
        MODULE.error("SpPellcastingEntryPF2e#prepareSiblingData", error);
    }
}

async function spellcastingEntryConsume(
    this: SpellcastingEntryPF2eWithCharges<NonNullable<CreaturePF2e>>,
    wrapped: libWrapper.RegisterCallback,
    spell: SpellPF2e<ActorPF2e>,
    rank: ZeroToTen,
    slotIndex?: number
): Promise<boolean> {
    const actor = this.actor;

    if (
        !actor.isOfType("npc", "character") ||
        !actor.spellcasting ||
        this.system.prepared.value !== "charges"
    ) {
        return wrapped(spell, rank, slotIndex);
    }

    try {
        const charges = this.system.slots.slot1.value;

        if (charges < rank) {
            warn("charges.error.notEnough", { spell: spell.name, rank: getRankLabel(rank) });
            return false;
        }

        await this.update({ "system.slots.slot1.value": charges - rank });
        return true;
    } catch (error) {
        MODULE.error("SpPellcastingEntryPF2e#consume", error);
        return false;
    }
}

async function spellcastingEntryGetSheetData(
    this: SpellcastingEntryPF2eWithCharges<NonNullable<CreaturePF2e>>,
    wrapped: libWrapper.RegisterCallback,
    options: { spells?: SpellCollection<CharacterPF2e> } = {}
): Promise<ChargesSpellcastingSheetData> {
    const actor = this.actor;
    const data: ChargesSpellcastingSheetData = await wrapped(options);

    if (
        !actor.isOfType("npc", "character") ||
        !actor.spellcasting ||
        this.system.prepared.value !== "charges"
    ) {
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

export {
    spellcastingEntryConsume,
    spellcastingEntryGetSheetData,
    spellcastingEntryPrepareSiblingData,
};
