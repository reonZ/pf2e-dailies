import { getFeat, hasAllFeats, SKILL_CATEGORIES } from '@src/feats'
import { getFlag, setFlag } from '@utils/foundry/flags'
import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { warn } from '@utils/foundry/notification'
import { createLongevityRule } from '@src/rules'
import { createSpellScroll } from '@utils/pf2e/spell'
import { chatUUID } from '@utils/foundry/uuid'

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
                    dropSelector: '[name="spell"]',
                },
            ],
        })
    }

    getData(options?: Partial<FormApplicationOptions> | undefined) {
        const actor = this._actor
        const saved = getFlag<Partial<SavedFlags>>(actor, 'saved') ?? {}
        const feats = hasAllFeats(actor)
        const skills = SKILL_LONG_FORMS.filter(x => actor.skills[x]!.rank! < 1).map(x => ({ skill: x }))

        return mergeObject(super.getData(options), {
            feats,
            saved,
            skills,
            i18n: localize,
            level: actor.level,
            getSpellValue: (values: ItemFlag[] | undefined, level: number, attr: 'name' | 'uuid') =>
                values?.[level - 1]?.[attr] ?? '',
        })
    }

    activateListeners(html: JQuery<HTMLElement>): void {
        super.activateListeners(html)

        html.find<HTMLAnchorElement>('[data-type=spell] [data-action=search]').on('click', this.#onSpellSearch.bind(this))
        html.find<HTMLAnchorElement>('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find<HTMLButtonElement>('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find<HTMLButtonElement>('[data-action=cancel]').on('click', this.#onCancel.bind(this))
    }

    protected async _onDrop(event: ElementDragEvent) {
        const dataString = event.dataTransfer?.getData('text/plain')

        try {
            const input = $(event.target)
            const typeError = () => localize.warn('spells.error.wrongType')

            const data: { type: string; uuid: string } = JSON.parse(dataString)
            if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return typeError()

            const item = await fromUuid<ItemPF2e>(data.uuid)
            if (!item?.isOfType('spell') || item.isCantrip || item.isRitual) return typeError()

            if (item.level > Number(input.attr('data-level'))) return localize.warn('spells.error.wrongLevel')

            input.attr('value', item.name)
            input.attr('data-uuid', item.uuid)
            input.nextAll('[data-action="clear"]').first().removeClass('disabled')
        } catch {}
    }

    #lock() {
        this.element.find('button').attr('disabled', 'true')
        this.element.find('a').addClass('disabled')
    }

    #validate() {
        const warns: string[] = []
        if (this.element.find('input[value=""]').length) warns.push('error.empty')
        warns.forEach(x => localize.warn(x))
        return !warns.length
    }

    async #onAccept(event: JQuery.ClickEvent) {
        event.preventDefault()

        if (!this.#validate()) return

        this.#lock()

        const actor = this._actor
        const flags = {} as SavedFlags
        const add: BaseItemSourcePF2e[] = []
        const choice: { uuid: string; choice: string; update: EmbeddedDocumentUpdateData<ItemPF2e> }[] = []
        let message = `${localize('message.changes')}<hr>`

        for (const featName of SKILL_CATEGORIES) {
            const feat = getFeat(actor, featName)
            if (!feat) continue

            const rules = deepClone(feat._source.system.rules)
            const selected = this.element.find(`[name=${featName}]`).val() as SkillLongForm

            const ruleIndex = rules.findIndex(x => 'pf2e-dailies' in x)
            if (ruleIndex >= 0) rules.splice(ruleIndex, 1)

            rules.push(createLongevityRule(selected))
            choice.push({
                uuid: feat.uuid,
                choice: selected,
                update: { _id: feat.id, 'system.rules': rules },
            })

            flags[featName] = selected
        }

        const groups = this.element.find('.window-content .groups .group').toArray()
        for (const el of groups) {
            const group = $(el)
            const category = group.attr('data-category') as ScrollGroup
            const spells = group.find<HTMLInputElement>('[name="spell"]').toArray()

            for (let i = 0; i < spells.length; i++) {
                const input = $(spells[i])
                const uuid = input.attr('data-uuid') as ItemUUID
                const level = Number(input.attr('data-level')) as OneToTen
                const name = input.attr('value') as string
                const value = { name, uuid }

                if (uuid) {
                    const scroll = await createSpellScroll(uuid, level, true)
                    if (scroll) add.push(scroll)
                }

                flags[category] ??= []
                flags[category][i] = value
            }
        }

        if (choice.length) {
            const data: EmbeddedDocumentUpdateData<ItemPF2e>[] = []
            message += `<p><strong>${localize('message.choices')}</strong></p>`

            for (const entry of choice) {
                message += `<p>${chatUUID(entry.uuid)} <span style="text-transform: capitalize;">${entry.choice}</span></p>`
                data.push(entry.update)
            }

            actor.updateEmbeddedDocuments('Item', data)
        }

        if (add.length) {
            if (choice.length) message += '<hr />'
            message += `<p><strong>${localize(`message.items`)}</strong></p>`
            const items = (await actor.createEmbeddedDocuments('Item', add)) as ItemPF2e[]
            items.map(x => (message += `<p>${chatUUID(x.uuid)}</p>`))
        }

        setFlag(actor, 'saved', flags)

        ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })

        this.close()
    }

    #onSpellSearch(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()

        const level = Number(event.currentTarget.dataset.level)
        const levels: number[] = []

        for (let i = 0; i < level; i++) {
            levels[i] = i + 1
        }

        const filter: InitialSpellFilters = {
            category: ['spell'],
            classes: [],
            level: levels,
            rarity: [],
            school: [],
            source: [],
            traditions: [],
            traits: [],
        }

        game.pf2e.compendiumBrowser.openTab('spell', filter)
    }

    #onClear(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()
        const target = $(event.currentTarget)
        const input = target.prevAll('[name="spell"]').first()
        input.attr('value', '')
        input.attr('data-uuid', '')
        target.addClass('disabled')
    }

    #onCancel(event: JQuery.ClickEvent) {
        event.preventDefault()
        this.close()
    }
}
