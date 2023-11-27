import { chatUUID } from '../module'

const scrollCompendiumIds = {
    1: 'RjuupS9xyXDLgyIr', // Compendium.pf2e.equipment-srd.Item.RjuupS9xyXDLgyIr
    2: 'Y7UD64foDbDMV9sx',
    3: 'ZmefGBXGJF3CFDbn',
    4: 'QSQZJ5BC3DeHv153',
    5: 'tjLvRWklAylFhBHQ',
    6: '4sGIy77COooxhQuC',
    7: 'fomEZZ4MxVVK3uVu',
    8: 'iPki3yuoucnj7bIt',
    9: 'cFHomF3tty8Wi1e5',
    10: 'o1XIHJ4MJyroAHfF',
}

const MAGIC_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal'])

const scrolls = []

export async function createSpellScroll(uuid, level, temp = false) {
    const spell = await fromUuid(uuid)
    if (!spell) return null

    if (level === false) level = spell.system.level.value

    const scrollUUID = `Compendium.pf2e.equipment-srd.Item.${scrollCompendiumIds[level]}`
    scrolls[level] ??= await fromUuid(scrollUUID)

    const scrollSource = scrolls[level]?.toObject()
    if (!scrollSource) return null

    const traits = scrollSource.system.traits
    traits.value = Array.from(new Set([...traits.value, ...spell.traits]))
    traits.rarity = spell.rarity
    if (traits.value.includes('magical') && traits.value.some(trait => MAGIC_TRADITIONS.has(trait))) {
        traits.value.splice(traits.value.indexOf('magical'), 1)
    }
    traits.value.sort()

    scrollSource._id = null
    scrollSource.name = game.i18n.format('PF2E.Item.Physical.FromSpell.Scroll', { name: spell.name, level })

    const description = scrollSource.system.description.value
    scrollSource.system.description.value = (() => {
        const paragraphElement = document.createElement('p')
        paragraphElement.append(spell.sourceId ? `@UUID[${spell.sourceId}]{${spell.name}}` : spell.description)

        const containerElement = document.createElement('div')
        const hrElement = document.createElement('hr')
        containerElement.append(paragraphElement, hrElement)
        hrElement.insertAdjacentHTML('afterend', description)

        return containerElement.innerHTML
    })()

    scrollSource.system.temporary = temp
    scrollSource.system.spell = spell.clone({ 'system.location.heightenedLevel': level }).toObject()

    return scrollSource
}
