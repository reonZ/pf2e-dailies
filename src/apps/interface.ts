import { flattenedUUIDS, getAllCategories, getRuleItems, isLanguageCategory, isScrollCategory, isSkillCategory } from '@src/items'
import { createLanguageRule, createTrainedSkillRule } from '@src/rules'
import { getFlag, setFlag } from '@utils/foundry/flags'
import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { chatUUID } from '@utils/foundry/uuid'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { createSpellScroll } from '@utils/pf2e/spell'
import { LANGUAGE_LIST } from '@utils/pf2e/languages'

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
        const level = actor.level
        const flags = getFlag<Partial<SavedFlags>>(actor, 'saved') ?? {}
        const categories = getAllCategories(actor)
        const skills = SKILL_LONG_FORMS.filter(x => actor.skills[x]!.rank! < 1).map(x => ({ skill: x }))
        const actorLanguages = actor.system.traits.languages.value
        const languages = LANGUAGE_LIST.filter(x => !actorLanguages.includes(x))
            .sort()
            .map(x => ({ language: x }))

        const skillItems: TemplateSkill[] = []
        const languageItems: TemplateLanguage[] = []
        const scrollItems: TemplateScroll[] = []

        for (const category in categories) {
            const items = categories[category as Category]
            if (!items[0]) continue

            const pushItem = (item: ItemPF2e, list: (TemplateLanguage | TemplateSkill)[]) => {
                if (item.isOfType('equipment') && !item.isInvested) return
                list.push({
                    category: category as RuleCategory,
                    name: item.name,
                    selected: flags[category as RuleCategory] ?? '',
                })
            }

            if (isSkillCategory(category)) pushItem(items[0], skillItems)
            if (isLanguageCategory(category)) pushItem(items[0], languageItems)

            if (isScrollCategory(category)) {
                const slots: TemplateScrollSlot[] = []

                const spellSlot = (spellLevel: number): TemplateScrollSlot => {
                    const { name, uuid } = flags[category]?.[spellLevel - 1] ?? { name: '', uuid: '' }
                    return { spellLevel, name, uuid }
                }

                slots.push(spellSlot(1))
                if (level >= 8) slots.push(spellSlot(2))

                if (items[1]) {
                    slots.push(spellSlot(3))
                    if (level >= 14) slots.push(spellSlot(4))
                    if (level >= 16) slots.push(spellSlot(5))
                }

                if (items[2]) {
                    slots.push(spellSlot(6))
                    if (level >= 20) slots.push(spellSlot(7))
                }

                scrollItems.push({
                    category,
                    name: items[0].name,
                    slots,
                })
            }
        }

        return mergeObject(super.getData(options), {
            i18n: localize,
            skillItems,
            skills,
            scrollItems,
            languages,
            languageItems,
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
        const ruleItems = getRuleItems(actor)
        const flags = {} as SavedFlags
        const add: BaseItemSourcePF2e[] = []
        const skills: ChoiceObject[] = []
        const languages: ChoiceObject[] = []
        let message = ''

        for (const item of ruleItems) {
            const uuid = item.getFlag('core', 'sourceId') as ItemUUID
            const category = flattenedUUIDS.get(uuid)!.category as RuleCategory
            const rules = deepClone(item._source.system.rules)
            const selected = this.element.find(`[name=${category}]`).val() as SkillLongForm | Language
            const ruleIndex = rules.findIndex(x => 'pf2e-dailies' in x)

            if (ruleIndex >= 0) rules.splice(ruleIndex, 1)

            const value = {
                uuid: item.uuid,
                choice: selected,
                update: { _id: item.id, 'system.rules': rules },
            }

            if (isSkillCategory(category)) {
                rules.push(createTrainedSkillRule(selected as SkillLongForm))
                skills.push(value)
            } else if (isLanguageCategory(category)) {
                rules.push(createLanguageRule(selected as Language))
                languages.push(value)
            }

            flags[category] = selected
        }

        const groups = this.element.find('.window-content .groups .group').toArray()
        for (const el of groups) {
            const group = $(el)
            const category = group.attr('data-category') as ScrollCategory
            const spells = group.find<HTMLInputElement>('[name="spell"]').toArray()

            for (let i = 0; i < spells.length; i++) {
                const input = $(spells[i])
                const uuid = input.attr('data-uuid') as ItemUUID
                const level = Number(input.attr('data-level')) as OneToTen
                const name = input.attr('value') as string

                if (uuid) {
                    const scroll = await createSpellScroll(uuid, level, true)
                    if (scroll) add.push(scroll)
                }

                flags[category] ??= []
                flags[category][i] = { name, uuid }
            }
        }

        const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = []

        const pushChoices = (category: string, choices: ChoiceObject[], separator = false) => {
            if (!choices.length) return

            if (separator && message) message += '<hr />'

            const title = localize(`message.${category}`)
            message += `<p><strong>${title}</strong></p>`

            for (const entry of choices) {
                message += `<p>${chatUUID(entry.uuid)} <span style="text-transform: capitalize;">${entry.choice}</span></p>`
                updateData.push(entry.update)
            }
        }

        pushChoices('skills', skills)
        pushChoices('languages', languages, true)

        if (updateData.length) await actor.updateEmbeddedDocuments('Item', updateData)

        if (add.length) {
            if (message) message += '<hr />'
            message += `<p><strong>${localize(`message.items`)}</strong></p>`
            const items = (await actor.createEmbeddedDocuments('Item', add)) as ItemPF2e[]
            items.map(x => (message += `<p>${chatUUID(x.uuid)}</p>`))
        }

        await setFlag(actor, 'saved', flags)

        message = `${localize('message.changes')}<hr>${message}`
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
