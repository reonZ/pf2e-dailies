type DailyUtils = typeof import('@src/api').utils

type BaseDailyValueArgs<T extends DailyGenerics = DailyGenerics> = {
    actor: CharacterPF2e
    item: ItemPF2e
    utils: DailyUtils
}

type DailyValueArgs<T extends DailyGenerics = DailyGenerics> = BaseDailyValueArgs<T> & {
    children: Record<T[2], ItemPF2e | undefined>
    custom: T[1]
}

type DailyPrepareArgs<T extends DailyGenerics = DailyGenerics> = Omit<DailyValueArgs<T>, 'custom'>

type DailyProcessFunctionArgs<T extends DailyGenerics = DailyGenerics> = DailyValueArgs<T> & {
    fields: DailyRowFields<T>
    messages: DailyMessagesObject
    addItem: DailyProcessAddFunction
    updateItem: DailyProcessUpdateFunction
    addRule: DailyProcessRulesFunction
    addFeat: DailyProcessFeatFunction
    addSpell: DailyProcessSpellFunction
}

type DailyRestArgs = {
    item: ItemPF2e
    sourceId: ItemUUID
    updateItem: DailyProcessUpdateFunction
}
