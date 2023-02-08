import {
    getCategoryUUIDS,
    getRuleItems,
    hasCategories,
    isAddedLanguage,
    isScrollChainRecord,
    isTrainedSkill,
    RULE_NAMES,
} from '@src/categories'
import { createLanguageRule, createTrainedSkillRule } from '@src/rules'
import { getFlag, hasSourceId, setFlag } from '@utils/foundry/flags'
import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { chatUUID } from '@utils/foundry/uuid'
import { LANGUAGE_LIST } from '@utils/pf2e/languages'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { createSpellScroll } from '@utils/pf2e/spell'

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
        const actor = this._actor
        const level = actor.level
        const flags = (getFlag(actor, 'saved') ?? {}) as SavedCategories
        const categories = hasCategories(actor)
        const rows: RowTemplate[] = []
        const groups: GroupTemplate[] = []
        const actorLanguages = actor.system.traits.languages.value
        const skills = SKILL_LONG_FORMS.filter(x => actor.skills[x]!.rank! < 1).map(x => ({ skill: x }))
        const languages = LANGUAGE_LIST.filter(x => !actorLanguages.includes(x))
            .sort()
            .map(x => ({ language: x }))

        for (const entry of categories) {
            if (isScrollChainRecord(entry)) {
                const { type, category, label, items } = entry
                const slots: ScrollChainTemplateSlot[] = []

                const spellSlot = (spellLevel: number): ScrollChainTemplateSlot => {
                    const { name, uuid } = flags[category]?.[spellLevel - 1] ?? { name: '', uuid: '' }
                    return { spellLevel, name, uuid }
                }

                // first feat
                slots.push(spellSlot(1))
                if (level >= 8) slots.push(spellSlot(2))

                // second feat
                if (items[1]) {
                    slots.push(spellSlot(3))
                    if (level >= 14) slots.push(spellSlot(4))
                    if (level >= 16) slots.push(spellSlot(5))
                }

                // third feat
                if (items[2]) {
                    slots.push(spellSlot(6))
                    if (level >= 20) slots.push(spellSlot(7))
                }

                const template: ScrollChainTemplate = { type, category, label, rows: slots }
                groups.push(template)
            } else if (isTrainedSkill(entry)) {
                const { type, category, label } = entry
                const selected = flags[category] ?? ''
                const template: TrainedSkillTemplate = { type, category, label, skills, selected }
                rows.push(template)
            } else if (isAddedLanguage(entry)) {
                const { type, category, label } = entry
                const selected = flags[category] ?? ''
                const template: AddedLanguageTemplate = { type, category, label, languages, selected }
                rows.push(template)
            }
        }

        rows.sort((a, b) => a.type.localeCompare(b.type))
        groups.sort((a, b) => a.rows.length - b.rows.length)

        return mergeObject(super.getData(options), {
            i18n: localize,
            groups,
            rows,
        })
    }

    activateListeners(html: JQuery<HTMLElement>): void {
        super.activateListeners(html)

        html.find<HTMLAnchorElement>('[data-action=searchSpell]').on('click', this.#onSpellSearch.bind(this))
        html.find<HTMLAnchorElement>('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find<HTMLButtonElement>('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find<HTMLButtonElement>('[data-action=cancel]').on('click', this.#onCancel.bind(this))
    }

    protected async _onDrop(event: ElementDragEvent) {
        let target = $(event.target)
        if (target.is('label')) target = target.next()

        const categoryType = target.attr('data-type') as CategoryType | undefined
        if (!categoryType) return

        try {
            const dataString = event.dataTransfer?.getData('text/plain')
            const typeError = () => localize.warn('error.drop.wrongType')

            const data: { type: string; uuid: string } = JSON.parse(dataString)
            if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return typeError()

            const item = await fromUuid<ItemPF2e>(data.uuid)
            if (!item) return typeError()

            switch (categoryType) {
                case 'scrollChain':
                    this.#onDropSpell(target, item)
                    break
            }
        } catch (error) {}
    }

    #onDropSpell(target: JQuery, item: ItemPF2e) {
        if (!item.isOfType('spell') || item.isCantrip || item.isRitual) return localize.warn('error.drop.spell.wrongType')
        if (item.level > Number(target.attr('data-level'))) return localize.warn('error.drop.spell.wrongLevel')

        target.attr('value', item.name)
        target.attr('data-uuid', item.uuid)
        target.nextAll('[data-action="clear"]').first().removeClass('disabled')
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

        let message = ''
        const actor = this._actor
        const flags = {} as SavedCategories
        const itemsToAdd: BaseItemSourcePF2e[] = []
        const selectedLanguages: SelectedObject[] = []
        const selectedSkills: SelectedObject[] = []

        const fields = this.element.find('.window-content .content').find('input, select').toArray() as Array<
            HTMLElement & TemplateFields
        >

        const ruleItems = (() => {
            const hasRuleCategories = fields.some(field => {
                const category = field.dataset.category as CategoryName
                return RULE_NAMES.includes(category as RuleName)
            })
            return hasRuleCategories ? getRuleItems(actor) : []
        })()

        for (const field of fields) {
            const type = field.dataset.type

            if (type === 'scrollChain') {
                const uuid = field.dataset.uuid
                const level = Number(field.dataset.level) as OneToTen
                const category = field.dataset.category
                const name = field.value

                if (uuid) {
                    const scroll = await createSpellScroll(uuid, level, true)
                    if (scroll) itemsToAdd.push(scroll)
                }

                flags[category] ??= []
                flags[category]![level - 1] = { name, uuid }
            } else if (type === 'addedLanguage' || type === 'trainedSkill') {
                const category = field.dataset.category
                const uuid = getCategoryUUIDS(category)[0]
                const item = ruleItems.find(item => hasSourceId(item, uuid))

                if (!item) continue

                const rules = deepClone(item._source.system.rules)
                const ruleIndex = rules.findIndex(rule => 'pf2e-dailies' in rule)
                const selected = field.value

                if (ruleIndex >= 0) rules.splice(ruleIndex, 1)

                const obj: SelectedObject = {
                    uuid,
                    selected,
                    update: { _id: item.id, 'system.rules': rules },
                }

                if (type === 'addedLanguage') {
                    rules.push(createLanguageRule(selected as Language))
                    selectedLanguages.push(obj)
                } else {
                    rules.push(createTrainedSkillRule(selected as SkillLongForm))
                    selectedSkills.push(obj)
                }

                // @ts-ignore
                flags[category] = selected
            }
        }

        const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = []
        const pushSelection = (type: 'skills' | 'languages', choices: SelectedObject[], separator = false) => {
            if (!choices.length) return

            if (separator && message) message += '<hr />'

            const title = localize(`message.${type}`)
            message += `<p><strong>${title}</strong></p>`

            for (const { uuid, selected, update } of choices) {
                message += `<p>${chatUUID(uuid)} <span style="text-transform: capitalize;">${selected}</span></p>`
                updateData.push(update)
            }
        }

        pushSelection('languages', selectedLanguages)
        pushSelection('skills', selectedSkills, true)

        if (updateData.length) await actor.updateEmbeddedDocuments('Item', updateData)

        if (itemsToAdd.length) {
            if (message) message += '<hr />'
            message += `<p><strong>${localize(`message.items`)}</strong></p>`
            const items = (await actor.createEmbeddedDocuments('Item', itemsToAdd)) as ItemPF2e[]
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

        console.log(filter)

        game.pf2e.compendiumBrowser.openTab('spell', filter)
    }

    #onClear(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()
        const target = $(event.currentTarget)
        const input = target.prevAll('input').first()
        input.attr('value', '')
        input.attr('data-uuid', '')
        target.addClass('disabled')
    }

    #onCancel(event: JQuery.ClickEvent) {
        event.preventDefault()
        this.close()
    }
}
