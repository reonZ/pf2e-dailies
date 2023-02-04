import { setModuleID } from '@utils/module'
import { renderCharacterSheetPF2e } from './sheet'

setModuleID('pf2e-dailies')

Hooks.on('renderCharacterSheetPF2e', renderCharacterSheetPF2e)
