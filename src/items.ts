import { MODULE_ID } from '@utils/module'

export async function createFeat(uuid: ItemUUID, parent: FeatPF2e) {
    const feat = ((await fromUuid(uuid)) as FeatPF2e | null)?.toObject()
    if (!feat) return

    setProperty(feat, 'flags.pf2e.grantedBy', { id: parent.id, onDelete: 'cascade' })
    setProperty(feat, `flags.${MODULE_ID}.temporary`, true)
    return feat
}
