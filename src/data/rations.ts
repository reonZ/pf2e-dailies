import { findItemWithSourceId } from '@utils/foundry/item'

const RATION_UUID = 'Compendium.pf2e.equipment-srd.Item.L9ZV076913otGtiB'

export function getRations(actor: CharacterPF2e) {
    return findItemWithSourceId(actor, RATION_UUID) as ConsumablePF2e | undefined
}
