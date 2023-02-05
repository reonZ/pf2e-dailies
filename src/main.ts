import { setModuleID } from '@utils/module'
import { wrapRestForTheNight } from './rest'
import { renderCharacterSheetPF2e } from './sheet'

setModuleID('pf2e-dailies')

Hooks.once('ready', () => {
    wrapRestForTheNight()
})

Hooks.on('renderCharacterSheetPF2e', renderCharacterSheetPF2e)

/**
Bort's Blessing
Quick Study (Loremaster Archetype)
Fighter's combat flexibility
 */
