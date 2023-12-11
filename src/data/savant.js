import { getSpellcastingEntryMaxSlotRank, getValidSpellcastingList } from '../spellcasting'

export const scrollSavant = {
    key: 'savant',
    item: {
        uuid: 'Compendium.pf2e.feats-srd.Item.u5DBg0LrBUKP0JsJ', // Scroll Adept
    },
    prepare: ({ actor }) => {
        const { maxSlot, maxTradition } = getSpellcastingTraditionDetails(actor, 'arcane')

        const custom = {
            first: { level: maxSlot - 2, condition: true },
            second: { level: maxSlot - 3, condition: true },
            third: { level: maxSlot - 4, condition: maxTradition >= 3 && maxSlot >= 5 },
            fourth: { level: maxSlot - 5, condition: maxTradition >= 4 && maxSlot >= 6 },
        }

        return custom
    },
    rows: ['first', 'second', 'third', 'fourth'].map(rowName => {
        const row = {
            type: 'drop',
            slug: rowName,
            label: ({ custom, utils }) => utils.spellRankLabel(custom[rowName].level),
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
            const uuid = field.uuid
            const source = await utils.createSpellScrollSource({ uuid, level: custom[field.row].level })
            addItem(source)
            messages.add('scrolls', { uuid, label: source.name })
        }
    },
}

function getSpellcastingTraditionDetails(actor, tradition) {
    let maxSlot = 1
    let maxTradition = 0

    const entries = getValidSpellcastingList(actor)
    for (const entry of entries) {
        const entryMaxSlot = getSpellcastingEntryMaxSlotRank(entry)
        if (entryMaxSlot > maxSlot) maxSlot = entryMaxSlot

        if (entry.tradition === tradition) maxTradition = Math.max(maxTradition, entry.rank)
    }

    return { maxSlot: Math.min(maxSlot, 10), maxTradition }
}
