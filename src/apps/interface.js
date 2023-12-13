import { utils } from '../api'
import { getDailies } from '../dailies'
import { getFamiliarPack } from '../data/familiar'
import { getRations } from '../data/rations'
import { findItemWithSourceId, getFlag, getSetting, subLocalize, templatePath } from '../module'
import { isPF2eStavesActive } from '../data/staves'
import { getActorMaxSlotRank } from '../actor'
import { getPreparedSpells } from '../spellcasting'
import { getTemplate } from './interface/data'
import { onDropFeat, onDropItem, onDropSpell } from './interface/drop'
import { processData } from './interface/process'
import { parseFilter } from './interface/shared'

const localize = subLocalize('interface')

const STAFF_NEXUS = 'Compendium.pf2e.classfeatures.Item.Klb35AwlkNrq1gpB'

export class DailiesInterface extends Application {
    constructor(actor, options) {
        super(options)
        this._actor = actor
        this._dailies = []
        this._dailyArgs = {}
        this._saved = {}
        this._children = {}
        this._custom = {}
        this._predicate = {}
        this._rows = {}
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'pf2e-dailies-interface',
            template: templatePath('interface.hbs'),
            height: 'auto',
            width: 400,
            submitOnClose: false,
            submitOnChange: false,
            dragDrop: [
                {
                    dropSelector: '[data-droppable="true"]',
                },
            ],
        })
    }

    get actor() {
        return this._actor
    }

    get dailies() {
        return this._dailies
    }

    get dailyArgs() {
        return this._dailyArgs
    }

    get saved() {
        return this._saved
    }

    get children() {
        return this._children
    }

    get custom() {
        return this._custom
    }

    get predicate() {
        return this._predicate
    }

    get rows() {
        return this._rows
    }

    async getData(options) {
        const templates = []
        const actor = this._actor
        this._dailies = getDailies(actor)

        if (actor.familiar) {
            const type = 'dailies.familiar'
            const localize = subLocalize('label')
            const nbAbilities = actor.attributes.familiarAbilities.value
            const pack = getFamiliarPack()
            const flags = getFlag(actor, type) ?? {}

            const template = {
                label: localize('familiar'),
                rows: [],
            }

            const options = pack.index.map(({ _id, name }) => ({ value: _id, label: name }))

            const customUUIDS = getSetting('familiar').split(',')
            for (let uuid of customUUIDS) {
                uuid = uuid.trim()
                const item = await fromUuid(uuid)
                if (item && item.isOfType('action')) options.push({ value: uuid, label: item.name })
            }

            options.sort((a, b) => a.label.localeCompare(b.label))

            for (let index = 0; index < nbAbilities; index++) {
                template.rows.push({
                    label: localize('ability', { nb: index + 1 }),
                    value: flags[`${index}`] ?? '',
                    order: 100,
                    options,
                    data: {
                        type: 'select',
                        daily: type,
                        row: index.toString(),
                        unique: 'ability',
                    },
                })
            }

            if (template.rows.length) {
                this._rows[type] = template.rows.reduce((rows, { data }) => {
                    rows[data.row] = { save: true }
                    return rows
                }, {})
                templates.push(template)
            }
        }

        {
            const rations = getRations(actor)
            if (rations?.uses.value) {
                const type = 'dailies.rations'
                const row = 'rations'
                const { value, max } = rations.uses
                const quantity = rations.quantity
                const remaining = (quantity - 1) * max + value
                const last = remaining <= 1

                const options = [
                    {
                        value: 'false',
                        label: localize('rations.no'),
                    },
                    {
                        value: 'true',
                        label: last ? localize('rations.last') : localize('rations.yes', { nb: remaining }),
                    },
                ]

                templates.push({
                    label: rations.name,
                    rows: [
                        {
                            label: '',
                            order: 200,
                            value: 'false',
                            options,
                            data: {
                                type: 'select',
                                daily: type,
                                row: row,
                            },
                        },
                    ],
                })

                this._rows[type] = { [row]: { save: false } }
            }
        }

        if (!isPF2eStavesActive()) {
            const staves = [
                { type: 'weapon', trait: 'magical' },
                { type: 'equipment', trait: 'coda' },
            ].flatMap(({ type, trait }) =>
                actor.itemTypes[type].filter(item => {
                    const traits = item.system.traits?.value
                    return traits && traits.includes('staff') && traits.includes(trait)
                })
            )

            const maxStaffCharges = getActorMaxSlotRank(actor)

            if (maxStaffCharges && staves.length) {
                const type = 'dailies.staff'
                const flags = getFlag(actor, type) ?? {}
                const options = staves.map(staff => ({
                    value: staff.id,
                    label: staff.name,
                }))
                options.sort((a, b) => a.label.localeCompare(b.label))

                const template = {
                    label: localize('staves.prepare'),
                    rows: [
                        {
                            label: localize('staves.staff'),
                            value: flags.staffID ?? '',
                            order: 100,
                            options,
                            data: {
                                type: 'select',
                                daily: type,
                                row: 'staffID',
                            },
                        },
                    ],
                }

                this._rows[type] = {
                    staffID: { save: true },
                }

                const preparedSpells = getPreparedSpells(actor)
                if (preparedSpells.length) {
                    preparedSpells.sort((a, b) =>
                        a.rank === b.rank ? a.spell.name.localeCompare(b.spell.name) : a.rank - b.rank
                    )

                    const options = preparedSpells.map(({ spell, rank, index }) => ({
                        value: spell.id,
                        label: `${spell.name} (${utils.spellRankLabel(rank)})`,
                        data: {
                            rank,
                            unique: `${spell.id}.${rank}.${index}`,
                        },
                    }))

                    options.unshift({ value: '', label: '' })

                    const staffNexus = findItemWithSourceId(actor, STAFF_NEXUS, 'feat')
                    const nbExpend = staffNexus && actor.level >= 8 ? (actor.level >= 16 ? 3 : 2) : 1

                    if (staffNexus) {
                        template.rows.push({
                            label: localize('staves.type'),
                            value: flags.makeshift ?? 'false',
                            order: 100,
                            options: [
                                { value: 'false', label: 'Regular Staff' },
                                { value: 'true', label: 'Makeshift Staff' },
                            ],
                            data: {
                                type: 'select',
                                daily: type,
                                row: `makeshift`,
                            },
                        })

                        this._rows[type].makeshift = { save: true }
                    }

                    for (let i = 1; i <= nbExpend; i++) {
                        template.rows.push({
                            label: localize('staves.expend'),
                            value: '',
                            order: 100,
                            options,
                            data: {
                                type: 'select',
                                daily: type,
                                row: `expend${i}`,
                                unique: 'expend',
                            },
                        })

                        this._rows[type][`expend${i}`] = { save: false }
                    }
                }

                templates.push(template)
            }
        }

        for (const daily of this._dailies) {
            try {
                const template = await getTemplate.call(this, daily)
                templates.push(template)
            } catch (error) {
                localize.error('error.unexpected')
                console.error(error)
                console.error(`The error occured during templating of ${daily.key}`)
            }
        }

        const rows = []
        const groups = []
        for (const template of templates) {
            if (template.rows.length > 1) groups.push(template)
            else if (template.rows.length) rows.push(template)
        }

        rows.sort((a, b) => b.rows[0].order - a.rows[0].order)
        groups.sort((a, b) => a.rows.length - b.rows.length)

        return mergeObject(super.getData(options), {
            i18n: localize,
            dump: ({ value, placeholder, data }) => {
                let msg = ''
                if (value) msg += ` value="${value}"`
                if (placeholder) msg += ` placeholder="${placeholder}"`
                if (typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => (msg += ` data-${key}="${value}"`))
                }
                if (msg) msg += ' '
                return msg
            },
            rows,
            groups,
            hasDailies: rows.length || groups.length,
        })
    }

    render(force, options) {
        if (this._randomInterval) clearInterval(this._randomInterval)

        if (this.element.find('select.random')) {
            this._randomInterval = setInterval(() => {
                const randoms = this.element.find('select.random')
                randoms.each((_, select) => {
                    select.selectedIndex = (select.selectedIndex + 1) % select.options.length
                })
            }, 2000)
        }

        return super.render(force, options)
    }

    close(options) {
        if (this._randomInterval) clearInterval(this._randomInterval)
        return super.close(options)
    }

    activateListeners(html) {
        super.activateListeners(html)

        html.find('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find('[data-action=cancel]').on('click', this.#onCancel.bind(this))

        html.find('.combo select').on('change', this.#onComboSelectChange.bind(this))
        html.find('.combo input').on('change', this.#onComboInputChange.bind(this))

        html.find('[data-action=search]').on('click', this.#onSearch.bind(this))

        html.find('[data-action=alert]').on('click', this.#onAlert.bind(this))

        const uniqueSelects = html.find('select[data-unique]')
        uniqueSelects.on('change', event => this.#cleanUniqueSelects(event.currentTarget, true))
        {
            const processedUniques = []

            for (const select of uniqueSelects) {
                const { unique, daily } = select.dataset
                const uniqueTag = `${daily}.${unique}`
                if (processedUniques.includes(uniqueTag)) continue

                processedUniques.push(uniqueTag)
                this.#cleanUniqueSelects(select, false)
            }
        }
    }

    _canDragDrop(selector) {
        return true
    }

    async _onDrop(event) {
        const localize = subLocalize('interface.error.drop')
        let target = event.target
        if (target instanceof HTMLLabelElement) target = target.nextElementSibling

        try {
            const dataString = event.dataTransfer?.getData('text/plain')
            const data = JSON.parse(dataString)

            if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return localize.warn('wrongDataType')

            const item = await fromUuid(data.uuid)
            if (!item) return localize.warn('wrongDataType')

            const filter = await this.#getfilterFromElement(target)
            if (!filter) return onDropItem(item, target)

            if (filter.type === 'feat') onDropFeat.call(this, item, target, filter)
            else if (filter.type === 'spell') onDropSpell.call(this, item, target, filter)
            else onDropItem(item, target)
        } catch (error) {
            localize.error('error.unexpected')
            console.error(error)
            console.error(`The error occured during _onDrop`)
        }
    }

    async #onAlert(event) {
        event.preventDefault()
        this.#lock()

        const data = event.currentTarget.dataset
        const row = this.rows[data.daily][data.row]
        const args = this.dailyArgs[data.daily]

        let fixed
        try {
            fixed = await row.fix(args)
        } catch (error) {
            localize.error('error.unexpected')
            console.error(error)
            console.error(`The error occured during an alert fix of '${data.daily}'`)
        }

        this.#unlock()
        if (fixed) this.render()
    }

    async #onSearch(event) {
        event.preventDefault()
        const filter = await this.#getfilterFromElement(event.currentTarget, true)
        if (filter) game.pf2e.compendiumBrowser.openTab(filter.type, filter.search)
        else game.pf2e.compendiumBrowser.render(true)
    }

    async #getfilterFromElement(element, parsed) {
        const { daily, row } = element.dataset
        const filter = this.rows[daily]?.[row]?.filter
        const args = this.dailyArgs[daily]

        if (!args || !filter) return

        if (typeof filter.search === 'function') filter.search = await filter.search(args)

        if (!parsed) return filter

        return parseFilter.call(this, filter)
    }

    #onComboSelectChange(event) {
        const select = event.currentTarget
        const input = select.nextElementSibling
        input.dataset.input = 'false'
        input.value = select.options[select.selectedIndex].text
    }

    #onComboInputChange(event) {
        const input = event.currentTarget
        const select = input.previousElementSibling
        const value = input.value.toLowerCase()
        const options = Array.from(select.options).map(x => x.value)

        const index = options.indexOf(value)
        if (index !== -1) {
            select.value = value
            input.value = select.options[index].text
            input.dataset.input = 'false'
        } else {
            select.value = ''
            input.dataset.input = 'true'
        }
    }

    #lock() {
        this.element.addClass('disabled')
    }

    #unlock() {
        this.element.removeClass('disabled')
    }

    #validate() {
        const warns = []
        const emptyInputs = this.element.find('input').filter((_, input) => !input.value)
        const alertInputs = this.element.find('input.alert')

        if (emptyInputs.length) warns.push('error.empty')
        if (alertInputs.length) warns.push('error.unattended')

        warns.forEach(x => localize.warn(x))

        return !warns.length
    }

    async #onAccept(event) {
        event.preventDefault()
        if (!this.#validate()) return
        this.#lock()
        await processData.call(this)
        this.close()
    }

    #onClear(event) {
        event.preventDefault()
        const target = $(event.currentTarget)
        const input = target.prevAll('input').first()
        input.val('')
        input.attr('value', '')
        input.attr('data-uuid', '')
        target.addClass('disabled')
    }

    #onCancel(event) {
        event.preventDefault()
        this.close()
    }

    #cleanUniqueSelects(select, isTarget) {
        const uniqueTag = select.dataset.unique
        const children = isTarget
            ? [select, ...getSiblings(select, `select[data-unique="${uniqueTag}"]`)]
            : select.parentElement.querySelectorAll(`:scope > select[data-unique="${uniqueTag}"]`)

        const uniqueOptions = new Set()

        for (const child of children) {
            let childIndex = child.selectedIndex
            const childOptions = child.options

            const optionUniqueValue = () => {
                const option = childOptions[childIndex]
                return option.dataset.unique ?? option.value
            }

            const optionExists = () => {
                const value = optionUniqueValue()
                return value && uniqueOptions.has(value)
            }

            while (optionExists() && childIndex > 0) {
                childIndex -= 1
            }

            const maxIndex = child.options.length - 1
            while (optionExists() && childIndex < maxIndex) {
                childIndex += 1
            }

            if (optionExists()) continue

            const finalValue = optionUniqueValue()
            if (finalValue) uniqueOptions.add(finalValue)

            if (child.selectedIndex !== childIndex) {
                child.selectedIndex = childIndex
            }
        }

        for (const child of children) {
            const childIndex = child.selectedIndex
            const childOptions = child.options

            for (let index = 0; index < childOptions.length; index++) {
                if (index === childIndex) continue

                const option = childOptions[index]
                option.disabled = uniqueOptions.has(option.dataset.unique ?? option.value)
            }
        }
    }
}

function getSiblings(el, selector) {
    const siblings = []

    const parent = el.parentElement
    if (!parent) return siblings

    const children = selector ? parent.querySelectorAll(`:scope > ${selector}`) : parent.children
    for (const child of children) {
        if (child === el) continue
        siblings.push(child)
    }

    return siblings
}
