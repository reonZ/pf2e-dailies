import { openDailiesInterface } from './api'
import { localize, setFlag } from './module'
import { getSpellcastingEntryMaxSlotRank, getValidSpellcastingList } from './spellcasting'
import { getSpellcastingEntryStaffData, isPF2eStavesActive, updateEntryCharges } from './staves'

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

    const charges = $(`<div class="pf2e-dailies-charges"><label>${localize('staves.label')}</label></div>`)

    const input = $(`<input type="number" min="0" max="${staffData.max}" value="${staffData.charges}">`)
    input.on('change', event => onStaffChargesChange(event, actor))

    const reset = $('<a><i class="fas fa-redo"></i></a>')
    reset.on('click', event => onStaffChargesReset(event, actor))

    charges.append(input)
    charges.append(reset)

    el.querySelector('.spell-ability-data .statistic-values').after(charges[0])
}

function getEntryDataFromEvent(event, actor) {
    const { itemId } = event.currentTarget.closest('.spellcasting-entry').dataset
    return actor.spellcasting.get(itemId)
}

async function onStaffChargesReset(event, actor) {
    const entry = getEntryDataFromEvent(event, actor)
    updateEntryCharges(entry, 9999)
}

async function onStaffChargesChange(event, actor) {
    const entry = getEntryDataFromEvent(event, actor)
    updateEntryCharges(entry, event.currentTarget.valueAsNumber)
}

export function getActorMaxSlotRank(actor) {
    let maxCharges = 0
    const entries = getValidSpellcastingList(actor, { itemOnly: true })

    for (const entry of entries) {
        const entryMaxCharges = getSpellcastingEntryMaxSlotRank(entry)
        if (entryMaxCharges > maxCharges) maxCharges = entryMaxCharges
    }

    return maxCharges
}
