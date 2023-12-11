import { onPerformDailyCrafting, renderCharacterSheetPF2e } from './actor'
import { openDailiesInterface, requestDailies, utils } from './api'
import { DailyCustoms } from './apps/custom'
import { renderChatMessage } from './chat'
import { BUILTINS_DAILIES, CUSTOM_DAILIES, checkCustomDaily, parseCustomDailies, prepareDailies } from './dailies'
import { MODULE_ID, getSetting, registerSetting, registerSettingMenu, warn } from './module'
import { isPF2eStavesActive } from './staves'
import { restForTheNight } from './rest'
import { onSpellcastingEntryCast } from './spellcasting'

export const EXT_VERSION = '1.3.0'

const SPELLCASTING_ENTRY_CAST = 'CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.cast'
const DAILY_CRAFTING = 'CONFIG.PF2E.Actor.documentClasses.character.prototype.performDailyCrafting'

Hooks.once('setup', () => {
    registerSetting({
        name: 'customDailies',
        type: Array,
        default: [],
        onChange: parseCustomDailies,
    })

    registerSetting({
        name: 'familiar',
        type: String,
        default: '',
        config: true,
    })

    registerSetting({
        name: 'watch',
        type: Boolean,
        default: false,
        config: true,
        onChange: enableWatchHook,
    })

    registerSetting({
        name: 'members',
        type: Boolean,
        default: true,
        config: true,
        scope: 'user',
    })

    registerSettingMenu({
        name: 'customs',
        type: DailyCustoms,
    })

    game.modules.get(MODULE_ID).api = {
        openDailiesInterface: actor => openDailiesInterface(actor),
        requestDailies,
        getBuiltinDailies: () => deepClone(BUILTINS_DAILIES),
        getCustomDailies: () => deepClone(CUSTOM_DAILIES),
        prepareDailies,
        checkCustomDaily,
        getUtils: () => deepClone(utils),
    }

    if (getSetting('watch')) enableWatchHook(true)

    if (!isPF2eStavesActive()) {
        CONFIG.PF2E.preparationType.charge = 'Charge'
        libWrapper.register(MODULE_ID, SPELLCASTING_ENTRY_CAST, onSpellcastingEntryCast)
    }
})

Hooks.once('ready', async () => {
    if (isPF2eStavesActive()) {
        warn('staves.conflict', true)
    }

    await parseCustomDailies()

    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
        warn('error.noLibwrapper', true)
        return
    }

    libWrapper.register(MODULE_ID, DAILY_CRAFTING, onPerformDailyCrafting, 'OVERRIDE')
})

Hooks.on('pf2e.restForTheNight', restForTheNight)

Hooks.on('renderCharacterSheetPF2e', renderCharacterSheetPF2e)

function enableWatchHook(enabled) {
    Hooks[enabled ? 'on' : 'off']('renderChatMessage', renderChatMessage)
}
