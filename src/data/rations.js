import { findItemWithSourceId } from '../module'

const RATION_UUID = 'Compendium.pf2e.equipment-srd.Item.L9ZV076913otGtiB'

export function getRations(actor) {
    return findItemWithSourceId(actor, RATION_UUID, 'consumable')
}
