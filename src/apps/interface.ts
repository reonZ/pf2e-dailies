import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { accept } from './interface/accept'
import { getData } from './interface/data'
import { dropped } from './interface/drop'
import { search } from './interface/search'

const localize = subLocalize('interface')

export class DailiesInterface extends Application {
    private _actor: CharacterPF2e

    constructor(actor: CharacterPF2e, options?: Partial<ApplicationOptions>) {
        super(options)
        this._actor = actor
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
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

    getData(options?: Partial<FormApplicationOptions> | undefined) {
        return mergeObject(super.getData(options), {
            i18n: localize,
            ...getData(this._actor),
        })
    }

    activateListeners(html: JQuery<HTMLElement>): void {
        super.activateListeners(html)

        html.find<SearchTemplateButton>('[data-action=search]').on('click', search)
        html.find<HTMLAnchorElement>('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find<HTMLButtonElement>('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find<HTMLButtonElement>('[data-action=cancel]').on('click', this.#onCancel.bind(this))
    }

    protected async _onDrop(event: ElementDragEvent) {
        dropped(event)
    }

    #lock() {
        this.element.addClass('disabled')
    }

    #validate() {
        const warns: string[] = []
        const emptyInputs = this.element.find('input').filter((_, input) => !input.value)

        if (emptyInputs.length) warns.push('error.empty')

        warns.forEach(x => localize.warn(x))

        return !warns.length
    }

    async #onAccept(event: JQuery.ClickEvent) {
        event.preventDefault()

        if (!this.#validate()) return

        return this.#lock()

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
