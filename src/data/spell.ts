export type SpellGenerics = ['spell', {}, '']

export function createSpellDaily(key: string, uuid: ItemUUID, filter: DailySpellFilter = {}, level?: number, label?: string) {
    const daily: Daily<SpellGenerics> = {
        key,
        label,
        item: {
            uuid,
        },
        rows: [
            {
                type: 'drop',
                slug: 'spell',
                filter: {
                    type: 'spell',
                    search: filter,
                },
            },
        ],
        process: async ({ addSpell, utils, fields, messages }) => {
            const uuid = fields.spell.uuid!
            const source = await utils.createSpellSource(uuid)
            const label = `${source.name} (Level ${level || source.system.level.value})`
            addSpell(source, level)
            messages.add('spells', { uuid, label })
        },
    }
    return daily
}
