import { openDailiesInterface } from './api'
import { getMaxStaffCharges, getSpellcastingEntryStaffData, isPF2eStavesActive, localize, setFlag } from './module'

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
    if (!actor.isOwner) return

    const small = html.find('aside .sidebar .hitpoints .hp-small')
    small
        .append(`<a class="roll-icon dailies" data-tooltip="${localize('sheet.title')}"><i class="fas fa-mug-saucer"></i></a>`)
        .find('.dailies')
        .on('click', () => openDailiesInterface(actor))

    if (!isPF2eStavesActive()) renderStavesEntries(html, actor)
}

function renderStavesEntries(html, actor) {
    const tab = html.find('.sheet-body .sheet-content [data-tab=spellcasting] .spellcastingEntry-list')
    const entries = tab.find('[data-container-type=spellcastingEntry]:not([data-container-id=rituals])')

    const { el, entry, staffData } = (() => {
        for (const el of entries) {
            const entryId = el.dataset.containerId
            const entry = actor.spellcasting.get(entryId)
            const staffData = getSpellcastingEntryStaffData(entry)
            if (staffData) return { el, entry, staffData }
        }

        return {}
    })()
    if (!el) return

    const charges = document.createElement('div')
    charges.classList.add('pf2e-dailies-charges')

    const label = document.createElement('label')
    label.innerText = localize('staves.label')

    const input = document.createElement('input')
    input.type = 'number'
    input.value = staffData.charges
    input.min = 0
    input.max = getMaxStaffCharges(actor) + (staffData.overcharge ?? 0)
    input.addEventListener('change', event => onStaffChargesChange(event, actor))

    charges.append(label)
    charges.append(input)

    el.querySelector('.spell-ability-data .statistic-values').after(charges)
}

async function onStaffChargesChange(event, actor) {
    const { itemId } = event.currentTarget.closest('.spellcasting-entry').dataset
    const entry = actor.spellcasting.get(itemId)
    const staffData = getSpellcastingEntryStaffData(entry)
    if (!staffData) return false

    const maxCharges = getMaxStaffCharges(actor) + (staffData.overcharge ?? 0)
    const updatedValue = Math.clamped(event.currentTarget.valueAsNumber, 0, maxCharges)

    if (updatedValue !== staffData.charges) {
        staffData.charges = updatedValue
        setFlag(entry, 'staff', staffData)
    }
}
