import { DailyCustoms } from '@apps/customs'
import { getCurrentModule } from '@utils/foundry/module'
import { warn } from '@utils/foundry/notification'
import { getSetting, registerSetting, registerSettingMenu } from '@utils/foundry/settings'
import { registerWrapper } from '@utils/libwrapper'
import { setModuleID } from '@utils/module'
import { openDailiesInterface, requestDailies } from './api'
import { renderChatMessage } from './chat'
import { parseCustomDailies } from './dailies'
import { restForTheNight } from './rest'
import { renderCharacterSheetPF2e } from './sheet'

export const MODULE_ID = 'pf2e-dailies'
setModuleID(MODULE_ID)

export const EXT_VERSION = '1.3.0'

Hooks.on('pf2e.restForTheNight', restForTheNight)

Hooks.on('renderCharacterSheetPF2e', renderCharacterSheetPF2e)

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

    registerSettingMenu({
        name: 'customs',
        type: DailyCustoms,
    })

    getCurrentModule<PF2eDailiesAPI>().api = {
        openDailiesInterface: actor => openDailiesInterface(actor),
        requestDailies,
    }

    if (getSetting('watch')) enableWatchHook(true)
})

Hooks.once('ready', async () => {
    await parseCustomDailies()

    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
        warn('error.noLibwrapper', true)
        return
    }

    registerWrapper(
        'CONFIG.PF2E.Actor.documentClasses.character.prototype.performDailyCrafting',
        onPerformDailyCrafting,
        'OVERRIDE'
    )
})

function enableWatchHook(enabled: boolean) {
    Hooks[enabled ? 'on' : 'off']('renderChatMessage', renderChatMessage)
}

async function onPerformDailyCrafting(this: CharacterPF2e) {
    const entries = (await this.getCraftingEntries()).filter(e => e.isDailyPrep)
    const alchemicalEntries = entries.filter(e => e.isAlchemical)
    const reagentCost = alchemicalEntries.reduce((sum, entry) => sum + entry.reagentCost, 0)
    const reagentValue = (this.system.resources.crafting.infusedReagents.value || 0) - reagentCost

    if (reagentValue < 0) {
        ui.notifications.warn(game.i18n.localize('PF2E.CraftingTab.Alerts.MissingReagents'))
        return
    } else {
        await this.update({ 'system.resources.crafting.infusedReagents.value': reagentValue })
    }

    for (const entry of entries) {
        for (const formula of entry.preparedCraftingFormulas) {
            const itemSource: PhysicalItemSource = formula.item.toObject()
            itemSource.system.quantity = formula.quantity
            itemSource.system.temporary = true
            itemSource.system.size = this.ancestry?.size === 'tiny' ? 'tiny' : 'med'

            if (
                entry.isAlchemical &&
                (itemSource.type === 'consumable' || itemSource.type === 'weapon' || itemSource.type === 'equipment')
            ) {
                itemSource.system.traits.value.push('infused')
            }
            await this.addToInventory(itemSource)
        }
    }
}
