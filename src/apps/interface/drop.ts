import { subLocalize } from '@utils/foundry/localize'
import { CATEGORY_SEARCH } from './search'

const localize = subLocalize('interface.error.drop')

export async function dropped(event: ElementDragEvent) {
    let target = $(event.target)
    if (target.is('label')) target = target.next()

    const categoryType = target.attr('data-type') as CategoryType | undefined
    if (!categoryType) return

    try {
        const dataString = event.dataTransfer?.getData('text/plain')
        const typeError = () => localize.warn('wrongDataType')

        const data: { type: string; uuid: string } = JSON.parse(dataString)
        if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return typeError()

        const item = await fromUuid<ItemPF2e>(data.uuid)
        if (!item) return typeError()

        switch (categoryType) {
            case 'scrollChain':
                droppedSpell(target, item, CATEGORY_SEARCH.scrollChain)
                break
            case 'combatFlexibility':
                droppedFeat(target, item, CATEGORY_SEARCH.combatFlexibility)
                break
            case 'scrollSavant':
                droppedSpell(target, item, CATEGORY_SEARCH.scrollSavant)
                break
        }
    } catch (error) {}
}

function droppedSpell(target: JQuery, item: ItemPF2e, { category = [], traditions = [] }: InitialSpellFilters = {}) {
    if (!item.isOfType('spell')) return localize.warn('wrongType', { type: 'spell' })

    if (item.isCantrip && !category.includes('cantrip')) return localize.warn('cannotBe', { type: 'spell', not: 'cantrip' })
    if (item.isRitual && !category.includes('ritual')) return localize.warn('cannotBe', { type: 'spell', not: 'ritual' })
    if (item.isFocusSpell && !category.includes('focus')) return localize.warn('cannotBe', { type: 'spell', not: 'focus' })

    if (traditions.length) {
        const itemTraditions = item.system.traditions.value
        for (const tradition of traditions) {
            if (!itemTraditions.includes(tradition))
                return localize.warn('wrongTrait', { type: 'spell', trait: tradition, category: 'tradition' })
        }
    }

    if (item.level > Number(target.attr('data-level'))) return localize.warn('wrongLevel', { type: 'spell' })

    droppedItem(target, item)
}

function droppedFeat(target: JQuery, item: ItemPF2e, { feattype = [], traits = [] }: InitialFeatFilters) {
    if (!item.isOfType('feat') || item.isFeature) return localize.warn('wrongType', { type: 'feat' })
    if (!feattype.includes(item.featType)) return localize.warn('cannotBe', { type: 'feat', not: item.featType })

    if (traits.length) {
        const itemTraits = item.system.traits.value
        for (const trait of traits) {
            if (!itemTraits.includes(trait)) return localize.warn('wrongTrait', { type: 'feat', trait, category: 'trait' })
        }
    }

    if (item.level > Number(target.attr('data-level'))) return localize.warn('wrongLevel', { type: 'feat' })

    droppedItem(target, item)
}

function droppedItem(target: JQuery, item: ItemPF2e) {
    target.val(item.name)
    target.attr('value', item.name)
    target.attr('data-uuid', item.uuid)
    target.nextAll('[data-action="clear"]').first().removeClass('disabled')
}
