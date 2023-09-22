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

const scrolls = []

export async function createSpellScroll(uuid, level, temp = false) {
    const spell = (await fromUuid(uuid))?.toObject()
    if (!spell) return null

    if (level === false) level = spell.system.level.value

    const scrollUUID = getScrollCompendiumUUID(level)
    scrolls[level] ??= await fromUuid(scrollUUID)

    const scroll = scrolls[level]?.toObject()
    if (!scroll) return null

    spell.system.location.heightenedLevel = level

    scroll.name = `Scroll of ${spell.name} (Level ${level})`
    scroll.system.temporary = temp
    scroll.system.spell = spell
    scroll.system.traits.value.push(...spell.system.traditions.value)

    const sourceId = spell.flags.core?.sourceId
    if (sourceId) scroll.system.description.value = `${chatUUID(sourceId)}\n<hr />${scroll.system.description.value}`

    return scroll
}

function getScrollCompendiumUUID(level) {
    return `Compendium.pf2e.equipment-srd.Item.${scrollCompendiumIds[level]}`
}
