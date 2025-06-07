import { getStaffData, StaffSpellcasting } from "data";
import {
    CharacterPF2e,
    ChatMessagePF2e,
    MODULE,
    SpellcastingEntry,
    SpellCollection,
    SpellSource,
    SpellToMessageOptions,
} from "module-helpers";
import { getHighestSpellcastingStatistic } from "module-helpers/src";

function onCharacterPrepareData(this: CharacterPF2e, wrapped: libWrapper.RegisterCallback): void {
    wrapped();

    try {
        const staffFlags = getStaffData(this);
        if (!staffFlags) return;

        const staff = this.items.get<dailies.StaffPF2e>(staffFlags.staffId);
        if (!staff) return;

        const staffStatistic = (() => {
            if (staffFlags.statistic) {
                const statistic = this.getStatistic(staffFlags.statistic.slug);
                return statistic
                    ? {
                          statistic,
                          tradition: staffFlags.statistic.tradition,
                      }
                    : undefined;
            }
            return getHighestSpellcastingStatistic(this);
        })();

        if (!staffStatistic) return;

        const collectionId = `${staff.id}-casting`;
        const staffEntry = new StaffSpellcasting(
            {
                ...staffStatistic,
                id: collectionId,
                name: staff.name,
                actor: this,
                castPredicate: [
                    `item:id:${staff.id}`,
                    { or: staffFlags.spells.map((s) => `spell:id:${s._id}`) },
                ],
            },
            staff
        ) as unknown as SpellcastingEntry<CharacterPF2e>;

        class StaffSpell extends CONFIG.PF2E.Item.documentClasses.spell<CharacterPF2e> {
            override async toMessage(
                event?: Maybe<MouseEvent | JQuery.TriggeredEvent>,
                { create = true, data, rollMode }: SpellToMessageOptions = {}
            ): Promise<ChatMessagePF2e | undefined> {
                const message = await super.toMessage(event, { rollMode, data, create: false });
                if (!message) return undefined;

                const messageSource = message.toObject();
                const flags = messageSource.flags.pf2e;

                flags.casting!.embeddedSpell = this.toObject();

                if (!create) {
                    message.updateSource(messageSource);
                    return message;
                }

                messageSource.whisper;

                return getDocumentClass("ChatMessage").create(
                    messageSource as ChatMessageCreateData<ChatMessagePF2e>,
                    {
                        renderSheet: false,
                    }
                );
            }
        }

        const SpellCollectionCls = this.spellcasting.get("rituals")!.spells!
            .constructor as typeof SpellCollection<CharacterPF2e>;
        const collection = new SpellCollectionCls(staffEntry);

        for (const spellSource of staffFlags.spells) {
            const source: SpellSource = foundry.utils.mergeObject(
                spellSource,
                { "system.location.value": collectionId },
                { inplace: false }
            );

            const spell = new StaffSpell(source, { parent: this });
            collection.set(spell.id, spell);
        }

        this.spellcasting.set(staffEntry.id, staffEntry);
        this.spellcasting.collections.set(collectionId, collection);
    } catch (error) {
        MODULE.error("CharacterPF2e#prepareData", error);
    }
}

export { onCharacterPrepareData };
