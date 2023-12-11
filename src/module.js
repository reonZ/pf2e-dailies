const KINETIC_ACTIVATION = 'Compendium.pf2e.feats-srd.Item.NV9H39kbkbjhAK6X'

export const MODULE_ID = 'pf2e-dailies'

export const AsyncFunction = async function () {}.constructor

export function getSetting(key) {
    return game.settings.get(MODULE_ID, key)
}

export function setSetting(key, value) {
    return game.settings.set(MODULE_ID, key, value)
}

function getSettingLocalizationPath(...path) {
    return `${MODULE_ID}.settings.${path.join('.')}`
}

export function registerSetting(options) {
    const name = options.name
    options.scope = options.scope ?? 'world'
    options.config = options.config ?? false
    if (options.config) {
        options.name = getSettingLocalizationPath(name, 'name')
        options.hint = getSettingLocalizationPath(name, 'hint')
    }
    if (Array.isArray(options.choices)) {
        options.choices = options.choices.reduce((choices, choice) => {
            choices[choice] = getSettingLocalizationPath(name, 'choices', choice)
            return choices
        }, {})
    }
    game.settings.register(MODULE_ID, name, options)
}

export function registerSettingMenu(options) {
    const name = options.name
    options.name = getSettingLocalizationPath('menus', name, 'name')
    options.label = getSettingLocalizationPath('menus', name, 'label')
    options.hint = getSettingLocalizationPath('menus', name, 'hint')
    options.restricted = options.restricted ?? true
    options.icon = options.icon ?? 'fas fa-cogs'
    game.settings.registerMenu(MODULE_ID, name, options)
}

export function templatePath(...path) {
    path = path.filter(x => typeof x === 'string')
    return `modules/${MODULE_ID}/templates/${path.join('/')}`
}

export function getFlag(doc, key, fallback) {
    return doc.getFlag(MODULE_ID, key) ?? fallback
}

export function setFlag(doc, key, value) {
    return doc.setFlag(MODULE_ID, key, value)
}

export function localize(...args) {
    let [key, data] = args
    key = `${MODULE_ID}.${key}`
    if (data) return game.i18n.format(key, data)
    return game.i18n.localize(key)
}

export function hasLocalization(key) {
    return game.i18n.has(`${MODULE_ID}.${key}`, false)
}

export function localizePath(key) {
    return `${MODULE_ID}.${key}`
}

export function subLocalize(subKey) {
    const fn = (...args) => localize(`${subKey}.${args[0]}`, args[1])

    Object.defineProperties(fn, {
        warn: {
            value: (...args) => warn(`${subKey}.${args[0]}`, args[1], args[2]),
            enumerable: false,
            configurable: false,
        },
        info: {
            value: (...args) => info(`${subKey}.${args[0]}`, args[1], args[2]),
            enumerable: false,
            configurable: false,
        },
        error: {
            value: (...args) => error(`${subKey}.${args[0]}`, args[1], args[2]),
            enumerable: false,
            configurable: false,
        },
        has: {
            value: key => hasLocalization(`${subKey}.${key}`),
            enumerable: false,
            configurable: false,
        },
        path: {
            value: key => localizePath(`${subKey}.${key}`),
            enumerable: false,
            configurable: false,
        },
        template: {
            value: (key, { hash }) => fn(key, hash),
            enumerable: false,
            configurable: false,
        },
    })

    return fn
}

export function getChatMessageClass() {
    return CONFIG.ChatMessage.documentClass
}

function notify(str, arg1, arg2, arg3) {
    const type = typeof arg1 === 'string' ? arg1 : 'info'
    const data = typeof arg1 === 'object' ? arg1 : typeof arg2 === 'object' ? arg2 : undefined
    const permanent = typeof arg1 === 'boolean' ? arg1 : typeof arg2 === 'boolean' ? arg2 : arg3 ?? false

    ui.notifications.notify(localize(str, data), type, { permanent })
}

export function warn(...args) {
    const [str, arg1, arg2] = args
    notify(str, 'warning', arg1, arg2)
}

export function info(...args) {
    const [str, arg1, arg2] = args
    notify(str, 'info', arg1, arg2)
}

export function error(...args) {
    const [str, arg1, arg2] = args
    notify(str, 'error', arg1, arg2)
}

export function getSourceId(doc) {
    return doc.getFlag('core', 'sourceId')
}

export function includesSourceId(doc, list) {
    const sourceId = getSourceId(doc)
    return sourceId ? list.includes(sourceId) : false
}

function getItemSourceIdCondition(sourceId) {
    return Array.isArray(sourceId) ? item => includesSourceId(item, sourceId) : item => getSourceId(item) === sourceId
}

export function getItems(actor, itemTypes) {
    return itemTypes ? itemTypes.flatMap(type => actor.itemTypes[type]) : actor.items
}

export function findItemWithSourceId(actor, sourceId, itemTypes) {
    return getItems(actor, itemTypes).find(getItemSourceIdCondition(sourceId))
}

export function sequenceArray(start, end) {
    const levels = []

    if (start <= end) {
        for (let i = start; i <= end; i++) levels.push(i)
    } else {
        for (let i = start; i >= end; i--) levels.push(i)
    }

    return levels
}

export function capitalize(str) {
    if (!str) return ''
    return str[0].toUpperCase() + str.slice(1)
}

export function chatUUID(uuid, name) {
    if (name) return `@UUID[${uuid}]{${name}}`
    return `@UUID[${uuid}]`
}

export function fakeChatUUID(name) {
    return `<span style="background: #DDD;
    padding: 1px 4px;
    border: 1px solid var(--color-border-dark-tertiary);
    border-radius: 2px;
    white-space: nowrap;
    word-break: break-all;">${name}</span>`
}

export function isInstanceOf(obj, name) {
    if (typeof obj !== 'object') return false

    while ((obj = Reflect.getPrototypeOf(obj))) {
        if (obj.constructor.name === name) return true
    }

    return false
}

export function isPF2eStavesActive() {
    return game.modules.get('pf2e-staves')?.active
}

export function getSpellcastingEntryStaffData(entry) {
    if (!entry) return

    const data = getFlag(entry, 'staff') ?? getProperty(entry, 'flags.pf2e-staves')
    if (!data) return

    delete data.prevDescription
    return deepClone(data)
}

export function getValidSpellcastingList(actor) {
    return actor.spellcasting.regular.filter(
        entry => !entry.flags?.['pf2e-staves'] && !getFlag(entry, 'staff') && entry.system.prepared.value !== 'items'
    )
}

export function getMaxEntrySlotRank(entry) {
    let maxSlot = 0

    const slots = entry.system.slots
    for (const key in slots) {
        const slot = slots[key]
        if (slot.max) maxSlot = Math.max(maxSlot, Number(key.slice(4)))
    }

    return maxSlot
}

export function getMaxStaffCharges(actor) {
    let maxCharges = 0
    const entries = getValidSpellcastingList(actor)

    for (const entry of entries) {
        const entryMaxCharges = getMaxEntrySlotRank(entry)
        if (entryMaxCharges > maxCharges) maxCharges = entryMaxCharges
    }

    if (hasKineticActivation(actor)) {
        const levelCharges = Math.ceil(actor.level / 2)
        if (levelCharges > maxCharges) maxCharges = levelCharges
    }

    return maxCharges
}

function hasKineticActivation(actor) {
    return actor.itemTypes.feat.some(feat => feat.sourceId === KINETIC_ACTIVATION)
}

export function getPreparedSpells(actor) {
    const spells = []

    const entries = actor.spellcasting.regular.filter(entry => entry.isPrepared)
    for (const entry of entries) {
        for (let rank = 1; rank <= 10; rank++) {
            const data = entry.system.slots[`slot${rank}`]
            if (!data.max) continue

            for (const { id, prepared, expended } of Object.values(data.prepared)) {
                if (prepared === false || expended) continue

                const spell = entry.spells.get(id)
                if (!spell) continue

                spells.push(spell)
            }
        }
    }

    return spells
}

export function getNotExpendedPreparedSpellSlot(spell) {
    if (!spell) return

    const rank = spell.rank
    const entry = spell.spellcasting
    const entries = Object.entries(entry.system.slots[`slot${rank}`].prepared)
    const prepared = entries.find(([_, { id, expended }]) => id === spell.id && expended !== true)
    if (!prepared) return

    return {
        slot: prepared[0],
        rank,
        entry,
    }
}

export function getBestSpellcastingEntry(actor) {
    const entries = getValidSpellcastingList(actor)

    let bestEntry = { mod: 0 }

    for (const { tradition, attribute, statistic, isInnate, rank } of entries) {
        if (isInnate) continue

        const mod = statistic.mod
        if (mod > bestEntry.mod) bestEntry = { tradition, attribute, mod, rank }
    }

    if (hasKineticActivation(actor)) {
        const { mod, rank, slug } = actor.classDCs.kineticist ?? {}
        if (mod > bestEntry.mod) bestEntry = { mod, rank, slug }
    }

    if (bestEntry.mod) return bestEntry
}
