type SavantRow = 'first' | 'second' | 'third' | 'fourth'
type SavantCustom = Record<SavantRow, { level: OneToTen; condition: boolean }>
type SavantGenerics = [SavantRow, SavantCustom, '']

export const scrollSavant: Daily<SavantGenerics> = {
    key: 'savant',
    item: {
        uuid: 'Compendium.pf2e.feats-srd.u5DBg0LrBUKP0JsJ', // Scroll Savant
    },
    prepare: ({ actor }) => {
        const { maxSlot, maxTradition } = getSpellcastingTraditionDetails(actor, 'arcane')

        const custom = {
            first: { level: maxSlot - 2, condition: true },
            second: { level: maxSlot - 3, condition: true },
            third: { level: maxSlot - 4, condition: maxTradition >= 3 && maxSlot >= 5 },
            fourth: { level: maxSlot - 5, condition: maxTradition >= 4 && maxSlot >= 6 },
        } as SavantCustom

        return custom
    },
    rows: (['first', 'second', 'third', 'fourth'] as const).map(rowName => {
        const row: DailyRowDrop<SavantGenerics> = {
            type: 'drop',
            slug: rowName,
            label: ({ custom }) => `PF2E.SpellLevel${custom[rowName].level}`,
            filter: {
                type: 'spell',
                search: ({ custom }) => ({
                    category: ['spell'],
                    traditions: ['arcane'],
                    level: custom[rowName].level,
                }),
            },
            condition: ({ custom }) => custom[rowName].condition,
        }
        return row
    }),
    process: async ({ utils, fields, custom, addItem, messages }) => {
        for (const field of Object.values(fields)) {
            const uuid = field.uuid!
            const source = await utils.createSpellScrollSource({ uuid, level: custom[field.row].level })
            addItem(source)
            messages.add('scrolls', { uuid, label: source.name })
        }
    },
}

function getSpellcastingTraditionDetails(actor: CharacterPF2e, tradition: MagicTradition) {
    let maxSlot: OneToTen = 1
    let maxTradition: ZeroToFour = 0

    for (const entry of actor.spellcasting.regular) {
        if (entry.flags && 'pf2e-staves' in entry.flags) continue // we skip staff entries

        const slots = entry.system.slots
        for (const key in slots) {
            const slot = slots[key as SlotKey]
            if (slot.max) maxSlot = Math.max(maxSlot, Number(key.slice(4))) as OneToTen
        }

        if (entry.tradition === tradition) maxTradition = Math.max(maxTradition, entry.rank) as ZeroToFour
    }

    return { maxSlot: Math.min(maxSlot, 10) as OneToTen, maxTradition }
}
