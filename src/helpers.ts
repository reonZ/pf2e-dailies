import { localize } from './@utils/foundry/i18n'
import { fakeChatUUID } from './@utils/foundry/uuid'

export function isValidTalismanType(item: ItemPF2e | null): item is ConsumablePF2e {
    if (!item || !item.isOfType('consumable')) return false
    if (!item.traits.has('talisman')) return false
    return true
}

export function isValidSpellType(item: ItemPF2e | null): item is SpellPF2e {
    if (!item || !item.isOfType('spell')) return false
    if (item.isCantrip || item.isRitual) return false
    return true
}

export function createMessage(key: string, data: { uuid: ItemUUID; name: string }[], fakeLink = false) {
    let msg = `<p>${localize(`app.message.${key}`)}</p>`
    data.forEach(x => {
        const name = x.name.endsWith(' **') ? x.name.slice(0, -3) : x.name
        msg += fakeLink ? `<p>${fakeChatUUID(name)}</p>` : `<p>@UUID[${x.uuid}]{${name}}</p>`
    })
    return msg
}
