import { setModuleID } from '@utils/module'
import { registerSetting, registerSettingMenu } from '@utils/foundry/settings'
import { parseCustomDailies } from './dailies'
import { restForTheNight } from './rest'
import { renderCharacterSheetPF2e } from './sheet'
import { DailyCustoms } from '@apps/customs'
import { registerWrapper } from '@utils/libwrapper'
import { warn } from '@utils/foundry/notification'

export const MODULE_ID = 'pf2e-dailies'
setModuleID(MODULE_ID)

export const EXT_VERSION = '1.2.0'

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

    registerSettingMenu({
        name: 'customs',
        type: DailyCustoms,
    })
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
