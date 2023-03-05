type MODULE_ID = typeof import('@src/main').MODULE_ID

type DailyRuleSource = AELikeSource & Partial<Record<MODULE_ID, true>>

type DailyMessage = { uuid?: ItemUUID; selected?: string; label?: string; random?: boolean }

type DailyMessageGroups = Record<string, DailyMessageGroup>
type DailyMessageGroup = {
    label?: string
    order: number
    messages: DailyMessage[]
}

type DailyMessagesObject = {
    add: (group: string, options: DailyMessage) => void
    addGroup: (group: string, order?: number, label?: string) => void
}

type DailyProcessAddFunction = (source: DeepPartial<BaseItemSourcePF2e>) => void
type DailyProcessUpdateFunction = (source: EmbeddedDocumentUpdateData<ItemPF2e>) => void
type DailyProcessRulesFunction = (source: DailyRuleSource, parent?: ItemPF2e) => void
type DailyProcessFeatFunction = (source: FeatSource, parent?: ItemPF2e) => void
type DailyProcessSpellFunction = (source: SpellSource, level?: number) => void
