import { getActorMaxSlotRank } from './actor'
import { getFlag, setFlag } from './module'

export function isPF2eStavesActive() {
    return game.modules.get('pf2e-staves')?.active
}

export function getSpellcastingEntryStaffFlags(entry) {
    if (!entry) return

    const data = getFlag(entry, 'staff') ?? getProperty(entry, 'flags.pf2e-staves')
    if (!data) return

    delete data.prevDescription
    return deepClone(data)
}

export function getSpellcastingEntryStaffData(entry) {
    const staffData = getSpellcastingEntryStaffFlags(entry)
    if (!staffData) return

    staffData.overcharge ??= 0
    staffData.max = getActorMaxSlotRank(entry.actor) + staffData.overcharge
    return staffData
}

export async function updateEntryCharges(entry, value) {
    const staffData = getSpellcastingEntryStaffData(entry)
    if (!staffData) return

    const updatedValue = Math.clamped(value, 0, staffData.max)

    if (updatedValue !== staffData.charges) {
        staffData.charges = updatedValue
        return setFlag(entry, 'staff', staffData)
    }
}
