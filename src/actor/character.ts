import { ACTIVATIONS_ENTRY_TYPES, ActivationSpellcasting } from "data";
import {
    ActorPF2e,
    CharacterPF2e,
    ChatMessagePF2e,
    getSpellCollectionCls,
    MagicTradition,
    MODULE,
    R,
    SpellcastingEntry,
    SpellSource,
    SpellToMessageOptions,
    Statistic,
    SYSTEM,
} from "foundry-helpers";
import { getHighestSpellcastingStatistic } from "spellcasting";

function onCharacterPrepareData(this: CharacterPF2e, wrapped: libWrapper.RegisterCallback): void {
    wrapped();

    for (const [key, { getData }] of R.entries(ACTIVATIONS_ENTRY_TYPES)) {
        try {
            prepareActivationData.call(this, getData(this));
        } catch (error: any) {
            MODULE.error(`CharacterPF2e#prepareData (${key})`, error);
        }
    }
}

function getItemStatistic(
    this: CharacterPF2e,
    data: dailies.ActivationFlag,
): { statistic: Statistic<ActorPF2e>; tradition: MagicTradition | null } | undefined {
    if (!data.statistic) {
        return getHighestSpellcastingStatistic(this);
    }

    const statistic = this.getStatistic(data.statistic.slug);
    if (!statistic) return;

    return {
        statistic,
        tradition: data.statistic.tradition,
    };
}

function prepareActivationData(this: CharacterPF2e, flagData: dailies.ActivationFlag | undefined) {
    if (!flagData) return;

    const item = this.items.get<dailies.ActivationItem>(flagData.staffId);
    if (!item) return;

    const statistic = getItemStatistic.call(this, flagData);
    if (!statistic) return;

    const collectionId = `${item.id}-casting`;
    const spellcastingEntry = new ActivationSpellcasting(
        {
            ...statistic,
            id: collectionId,
            name: item.name,
            actor: this,
            castPredicate: [`item:id:${item.id}`, { or: flagData.spells.map((s) => `spell:id:${s._id}`) }],
        },
        item,
    ) as unknown as SpellcastingEntry<CharacterPF2e>;

    class ActivationSpell extends CONFIG.PF2E.Item.documentClasses.spell<CharacterPF2e> {
        override async toMessage(
            event?: Maybe<PointerEvent>,
            { actualCast, create = true, data, rollMode }: SpellToMessageOptions = {},
        ): Promise<ChatMessagePF2e | undefined> {
            const message = await super.toMessage(event, { actualCast, rollMode, data, create: false });
            if (!message) return undefined;

            const messageSource = message.toObject();

            foundry.utils.setProperty(messageSource, `flags.${SYSTEM.id}.casting.embeddedSpell`, this.toObject());

            if (!create) {
                message.updateSource(messageSource);
                return message;
            }

            return getDocumentClass("ChatMessage").create(messageSource, { renderSheet: false });
        }
    }

    const SpellCollection = getSpellCollectionCls(this);
    const collection = new SpellCollection(spellcastingEntry);

    for (const spellSource of flagData.spells) {
        const source: SpellSource = foundry.utils.mergeObject(
            spellSource,
            { "system.location.value": collectionId },
            { inplace: false },
        );

        const spell = new ActivationSpell(source, { parent: this });
        collection.set(spell.id, spell);
    }

    this.spellcasting.set(spellcastingEntry.id, spellcastingEntry);
    this.spellcasting.collections.set(collectionId, collection);
}

export { onCharacterPrepareData };
