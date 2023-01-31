import { getSetting, registerSetting } from './@utils/foundry/settings'
import { onRenderCharacterSheetPF2e } from './sheet'
import { setWarning } from './warning'

Hooks.on('renderCharacterSheetPF2e', onRenderCharacterSheetPF2e)

Hooks.once('init', () => {
    registerSetting({
        name: 'warning',
        type: Boolean,
        default: true,
        scope: 'client',
        config: true,
        onChange: setWarning,
    })
})

Hooks.once('ready', () => {
    if (getSetting<boolean>('warning')) {
        setTimeout(() => setWarning(true), 2000)
    }
})
