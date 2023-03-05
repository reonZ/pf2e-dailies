import { setModuleID } from '@utils/module'
import { registerSetting, registerSettingMenu } from '@utils/foundry/settings'
import { parseCustomDailies } from './dailies'
import { restForTheNight } from './rest'
import { renderCharacterSheetPF2e } from './sheet'
import { DailyCustoms } from '@apps/customs'

export const MODULE_ID = 'pf2e-dailies'
setModuleID(MODULE_ID)

export const EXT_VERSION = '1.1.0'

Hooks.on('pf2e.restForTheNight', restForTheNight)

Hooks.on('renderCharacterSheetPF2e', renderCharacterSheetPF2e)

Hooks.once('setup', () => {
    registerSetting({
        name: 'customDailies',
        type: Array,
        default: [],
        onChange: parseCustomDailies,
    })

    registerSettingMenu({
        name: 'customs',
        type: DailyCustoms,
    })
})

Hooks.once('ready', async () => {
    await parseCustomDailies()
})
