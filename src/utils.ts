import { MODULE_ID } from '@utils/module'

export async function createFeat(uuid: ItemUUID, parent: FeatPF2e) {
    const feat = ((await fromUuid(uuid)) as FeatPF2e | null)?.toObject()
    if (!feat) return

    setProperty(feat, 'flags.pf2e.grantedBy', { id: parent.id, onDelete: 'cascade' })
    setProperty(feat, `flags.${MODULE_ID}.temporary`, true)
    return feat
}

export function getSpellcastingDetails(actor: ActorPF2e, tradition: MagicTradition) {
    let maxSlot = 0
    let maxTradition = 0
    for (const entry of actor.spellcasting) {
        if (entry.flags['pf2e-staves']) continue // we skip staff entries

        const slots = entry.system.slots
        for (const key in slots) {
            const slot = slots[key as SlotKey]
            if (slot.max) maxSlot = Math.max(maxSlot, Number(key.slice(4)))
        }

        if (entry.tradition === tradition) maxTradition = Math.max(maxTradition, entry.rank)
    }
    return { maxSlot: Math.clamped(maxSlot, 1, 10), maxTradition }
}
