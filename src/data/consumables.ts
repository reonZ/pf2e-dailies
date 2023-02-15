import { findItemWithSourceId } from '@utils/foundry/item'

const RATION_UUID = 'Compendium.pf2e.equipment-srd.L9ZV076913otGtiB'

export function getRations(actor: CharacterPF2e) {
    return findItemWithSourceId<CharacterPF2e, ConsumablePF2e>(actor, RATION_UUID)
}
