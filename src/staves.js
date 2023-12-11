import { getFlag } from './module'
import { getSpellcastingEntryMaxSlotRank, getValidSpellcastingList } from './spellcasting'

export function isPF2eStavesActive() {
    return game.modules.get('pf2e-staves')?.active
}

export function getSpellcastingEntryStaffData(entry) {
    if (!entry) return

    const data = getFlag(entry, 'staff') ?? getProperty(entry, 'flags.pf2e-staves')
    if (!data) return

    delete data.prevDescription
    return deepClone(data)
}

export function getMaxStaffCharges(actor) {
    let maxCharges = 0
    const entries = getValidSpellcastingList(actor, { itemOnly: true })

    for (const entry of entries) {
        const entryMaxCharges = getSpellcastingEntryMaxSlotRank(entry)
        if (entryMaxCharges > maxCharges) maxCharges = entryMaxCharges
    }

    return maxCharges
}
