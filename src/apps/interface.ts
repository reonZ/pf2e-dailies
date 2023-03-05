import { getDailies } from '@src/dailies'
import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { getFlag } from '@utils/foundry/flags'
import { getTemplate } from './interface/data'
import { onDropFeat, onDropItem, onDropSpell } from './interface/drop'
import { processData } from './interface/process'
import { parseFeatFilter, parseSpellFilter } from './interface/shared'
import { getFamiliarPack } from '@data/familiar'
import { getRations } from '@data/rations'

const localize = subLocalize('interface')

export class DailiesInterface extends Application {
    private _actor: CharacterPF2e
    private _randomInterval?: NodeJS.Timer
    private _dailies: ReturnedDaily[] = []
    private _dailyArgs: Record<string, DailyValueArgs> = {}
    private _saved: Record<string, DailySaved> = {}
    private _children: Record<string, DailyValueArgs['children']> = {}
    private _custom: Record<string, DailyCustom> = {}
    private _predicate: Record<string, string[]> = {}
    private _rows: Record<string, Record<string, DailyRow>> = {}

    constructor(actor: CharacterPF2e, options?: Partial<ApplicationOptions>) {
        super(options)
        this._actor = actor
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'pf2e-dailies-interface',
            title: localize('title'),
            template: templatePath('interface.hbs'),
            height: 'auto',
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

    async getData(options?: Partial<FormApplicationOptions> | undefined) {
        const templates: DailyTemplate[] = []
        const actor = this._actor
        this._dailies = getDailies(actor)

        if (actor.familiar) {
            const type = 'dailies.familiar'
            const localize = subLocalize('label')
            const nbAbilityies = actor.attributes.familiarAbilities.value
            const pack = getFamiliarPack()
            const options = pack.index.map(index => ({ value: index._id, label: index.name }))
            const flags = getFlag<Record<`${number}`, string>>(actor, type) ?? {}

            const template: DailyTemplate = {
                label: localize('familiar'),
                rows: [],
            }

            for (let index = 0; index < nbAbilityies; index++) {
                template.rows.push({
                    label: localize('ability', { nb: index + 1 }),
                    value: flags[`${index}`] ?? '',
                    order: 100,
                    options,
                    data: {
                        type: 'select',
                        daily: type,
                        row: index.toString(),
                    },
                })
            }

            if (template.rows.length) {
                this._rows[type] = template.rows.reduce((rows, { data }) => {
                    rows[data.row] = { save: true } as DailyRow
                    return rows
                }, {} as Record<string, DailyRow>)
                templates.push(template)
            }
        }

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

            this._rows[type] = { [row]: { save: false } as DailyRow }
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

        const rows: DailyTemplate[] = []
        const groups: DailyTemplate[] = []
        for (const template of templates) {
            if (template.rows.length > 1) groups.push(template)
            else if (template.rows.length) rows.push(template)
        }

        rows.sort((a, b) => b.rows[0]!.order - a.rows[0]!.order)
        groups.sort((a, b) => a.rows.length - b.rows.length)

        return mergeObject(super.getData(options), {
            i18n: localize,
            dump: ({ value, placeholder, data }: DailyRowTemplate) => {
                let msg = ''
                if (value) msg += ` value="${value}"`
                if (placeholder) msg += ` placeholder="${placeholder}"`
                Object.entries(data).forEach(([key, value]) => (msg += ` data-${key}="${value}"`))
                if (msg) msg += ' '
                return msg
            },
            rows,
            groups,
        })
    }

    render(force?: boolean | undefined, options?: RenderOptions | undefined): this | Promise<this> {
        if (this._randomInterval) clearInterval(this._randomInterval)

        if (this.element.find('select.random')) {
            this._randomInterval = setInterval(() => {
                const randoms = this.element.find<HTMLSelectElement>('select.random')
                randoms.each((_, select) => {
                    select.selectedIndex = (select.selectedIndex + 1) % select.options.length
                })
            }, 2000)
        }

        return super.render(force, options)
    }

    close(options?: ({ force?: boolean | undefined } & Record<string, unknown>) | undefined): Promise<void> {
        if (this._randomInterval) clearInterval(this._randomInterval)
        return super.close(options)
    }

    activateListeners(html: JQuery<HTMLElement>): void {
        super.activateListeners(html)

        html.find<HTMLAnchorElement>('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find<HTMLButtonElement>('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find<HTMLButtonElement>('[data-action=cancel]').on('click', this.#onCancel.bind(this))

        html.find<HTMLSelectElement>('.combo select').on('change', this.#onComboSelectChange.bind(this))
        html.find<HTMLInputElement>('.combo input').on('change', this.#onComboInputChange.bind(this))

        html.find<HTMLAnchorElement>('[data-action=search]').on('click', this.#onSearch.bind(this))

        html.find<HTMLAnchorElement>('[data-action=alert]').on('click', this.#onAlert.bind(this))
    }

    protected async _onDrop(event: ElementDragEvent) {
        const localize = subLocalize('interface.error.drop')
        let target = event.target as HTMLInputElement | HTMLLabelElement
        if (target instanceof HTMLLabelElement) target = target.nextElementSibling as HTMLInputElement

        try {
            const dataString = event.dataTransfer?.getData('text/plain')
            const data: { type: string; uuid: string } = JSON.parse(dataString)
            if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return localize.warn('wrongDataType')

            const item = await fromUuid<ItemPF2e>(data.uuid)
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

    async #onAlert(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()
        this.#lock()

        const data = event.currentTarget.dataset as { daily: string; row: string }
        const row = this.rows[data.daily]![data.row]! as DailyRowAlert
        const args = this.dailyArgs[data.daily]!

        let fixed
        try {
            console.log('before fix')
            fixed = await row.fix(args)
            console.log('after fix')
        } catch (error) {
            localize.error('error.unexpected')
            console.error(error)
            console.error(`The error occured during an alert fix of '${data.daily}'`)
        }

        this.#unlock()
        console.log(fixed)
        if (fixed) this.render()
    }

    async #onSearch(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()
        const filter = await this.#getfilterFromElement(event.currentTarget)
        if (filter) game.pf2e.compendiumBrowser.openTab(filter.type, filter.search)
        else game.pf2e.compendiumBrowser.render(true)
    }

    async #getfilterFromElement(element: HTMLElement) {
        const { daily, row } = element.dataset as { daily: string; row: string }
        const filter = (this.rows[daily]?.[row] as DailyRowDrop | undefined)?.filter
        const args = this.dailyArgs[daily]

        if (!args || !filter) return

        let { search, drop, type } = filter
        if (typeof search === 'function') search = await search(args)

        if (type === 'feat') {
            return {
                type: 'feat',
                search: parseFeatFilter(this.actor, search as DailyFeatFilter),
                drop,
            } as DailyRowDropParsedFeat
        } else {
            return {
                type: 'spell',
                search: parseSpellFilter(this.actor, search as DailySpellFilter),
                drop,
            } as DailyRowDropParsedSpell
        }
    }

    #onComboSelectChange(event: JQuery.ChangeEvent) {
        const select = event.currentTarget as HTMLSelectElement
        const input = select.nextElementSibling as HTMLInputElement
        input.dataset.input = 'false'
        input.value = select.options[select.selectedIndex]!.text
    }

    #onComboInputChange(event: JQuery.ChangeEvent<any, any, HTMLInputElement>) {
        const input = event.currentTarget
        const select = input.previousElementSibling as HTMLSelectElement
        const value = input.value.toLowerCase()
        const options = Array.from(select.options).map(x => x.value)

        const index = options.indexOf(value)
        if (index !== -1) {
            select.value = value
            input.value = select.options[index]!.text
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
        const warns: string[] = []
        const emptyInputs = this.element.find('input').filter((_, input) => !input.value)
        const alertInputs = this.element.find('input.alert')

        if (emptyInputs.length) warns.push('error.empty')
        if (alertInputs.length) warns.push('error.unattended')

        warns.forEach(x => localize.warn(x))

        return !warns.length
    }

    async #onAccept(event: JQuery.ClickEvent) {
        event.preventDefault()
        if (!this.#validate()) return
        this.#lock()
        await processData.call(this)
        this.close()
    }

    #onClear(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()
        const target = $(event.currentTarget)
        const input = target.prevAll('input').first()
        input.val('')
        input.attr('value', '')
        input.attr('data-uuid', '')
        target.addClass('disabled')
    }

    #onCancel(event: JQuery.ClickEvent) {
        event.preventDefault()
        this.close()
    }
}
