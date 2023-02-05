import { setModuleID } from '@utils/module'
import { wrapRestForTheNight } from './rest'
import { renderCharacterSheetPF2e } from './sheet'

setModuleID('pf2e-dailies')

Hooks.once('ready', () => {
    wrapRestForTheNight()
})

Hooks.on('renderCharacterSheetPF2e', renderCharacterSheetPF2e)

/**
Ageless Spirit (Leshy)
Ancestral Linguistics (Elf)
Ancient Memories (Ghoran)
Consult The Stars (Lizardfolk, *More or less, you can do this at any time of day, so maybe doesn't work for Dailies)
Flexible Studies (Investigator)
Quick Study (Loremaster Archetype)
Fighter's combat flexibility
 */
