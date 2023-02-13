import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { PROFICIENCY_RANKS } from '@utils/pf2e/actor'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { capitalize } from '@utils/string'
import { accept } from './interface/accept'
import { onAlert } from './interface/alert'
import { getData } from './interface/data'
import { dropped } from './interface/drop'
import { onSearch } from './interface/search'

const localize = subLocalize('interface')

export class DailiesInterface extends Application {
    private _actor: CharacterPF2e
    private _randomInterval?: NodeJS.Timer

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

    getData(options?: Partial<FormApplicationOptions> | undefined) {
        return mergeObject(super.getData(options), {
            i18n: localize,
            ...getData(this._actor),
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

        html.find<HTMLAnchorElement>('[data-action=alert]').on('click', onAlert.bind(this))

        html.find<HTMLSelectElement>('.combo select').on('change', this.#onComboSelectChange.bind(this))
        html.find<ComboTemplateField>('.combo input').on('change', this.#onComboInputChange.bind(this))

        html.find<SearchTemplateButton>('[data-action=search]').on('click', onSearch)

        html.find<HTMLAnchorElement>('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find<HTMLButtonElement>('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find<HTMLButtonElement>('[data-action=cancel]').on('click', this.#onCancel.bind(this))
    }

    protected async _onDrop(event: ElementDragEvent) {
        dropped(event)
    }

    #onComboSelectChange(event: JQuery.ChangeEvent) {
        const select = event.currentTarget
        const input = select.nextElementSibling as HTMLInputElement
        input.dataset.input = 'false'
        input.value = capitalize(select.value)
    }

    #onComboInputChange(event: JQuery.ChangeEvent<any, any, ComboTemplateField>) {
        const input = event.currentTarget
        const select = input.previousElementSibling as HTMLSelectElement
        const value = input.value.toLowerCase()
        const type = input.dataset.type

        // TODO original should be conditional on type if more are to come
        const original = SKILL_LONG_FORMS as string[]
        const options = Array.from(select.options).map(x => x.value)

        if (options.includes(value)) {
            select.value = value
            input.value = capitalize(value)
            input.dataset.input = 'false'
        } else if (original.includes(value)) {
            if (type === 'trainedSkill') {
                const rank = Number(input.dataset.rank || '1')
                localize.warn('error.input.proficiency', { rank: PROFICIENCY_RANKS[rank], proficiency: value })
            }

            select.value = ''
            input.value = ''
            input.dataset.input = 'true'
        } else {
            select.value = ''
            input.dataset.input = 'true'
        }
    }

    #lock() {
        this.element.addClass('disabled')
    }

    #validate() {
        const warns: string[] = []
        const emptyInputs = this.element.find('input').filter((_, input) => !input.value)
        const errorInputs = this.element.find('input.alert')

        if (emptyInputs.length) warns.push('error.empty')
        if (errorInputs.length) warns.push('error.unattended')

        warns.forEach(x => localize.warn(x))

        return !warns.length
    }

    async #onAccept(event: JQuery.ClickEvent) {
        event.preventDefault()

        if (!this.#validate()) return

        this.#lock()

        try {
            await accept(this.element, this._actor)
        } catch (error) {
            localize.error('error.unexpected')
            console.error(error)
        }

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
