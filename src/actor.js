import { openDailiesInterface } from './api'
import { hasAnyDaily } from './dailies'
import { localize } from './module'

export async function onPerformDailyCrafting() {
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
            const itemSource = formula.item.toObject()
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

export function renderCharacterSheetPF2e(sheet, html) {
    const actor = sheet.actor
    if (!actor.isOwner || !hasAnyDaily(actor)) return

    const small = html.find('aside .sidebar .hitpoints .hp-small')
    small
        .append(`<a class="roll-icon dailies" data-tooltip="${localize('sheet.title')}"><i class="fas fa-mug-saucer"></i></a>`)
        .find('.dailies')
        .on('click', () => openDailiesInterface(actor, true))
}
