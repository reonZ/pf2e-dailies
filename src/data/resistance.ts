type ResistanceGenerics = ['resistance', {}, '']

export function createResistancelDaily(
    key: string,
    uuid: ItemUUID,
    resistances: string[],
    resistance: number | 'half' | 'level',
    label?: string,
    random?: boolean
) {
    const daily: Daily<ResistanceGenerics> = {
        key,
        label,
        item: {
            uuid,
        },
        rows: [
            {
                type: random ? 'random' : 'select',
                slug: 'resistance',
                options: resistances,
                labelizer: ({ utils }) => utils.resistanceLabel,
            },
        ],
        process: async ({ utils, fields, actor, addRule, messages }) => {
            const type = random ? await utils.randomOption(resistances) : fields.resistance.value
            const value =
                typeof resistance === 'number' ? resistance : resistance === 'half' ? utils.halfLevelValue(actor) : actor.level
            const rule = utils.createResistanceRuleElement({ type, value })
            addRule(rule)
            messages.add('resistances', { uuid, selected: utils.resistanceLabel(type, value), label, random })
        },
    }
    return daily
}
