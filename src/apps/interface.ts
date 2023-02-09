import {
    CATEGORY_SEARCH,
    getCategoryUUIDS,
    getRuleItems,
    hasCategories,
    isAddedLanguage,
    isCombatFlexibility,
    isScrollChainRecord,
    isTrainedSkill,
    RULE_TYPES,
} from '@src/categories'
import { createLanguageRule, createTrainedSkillRule } from '@src/rules'
import { getFlag, hasSourceId, setFlag } from '@utils/foundry/flags'
import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { chatUUID } from '@utils/foundry/uuid'
import { LANGUAGE_LIST } from '@utils/pf2e/languages'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { createSpellScroll } from '@utils/pf2e/spell'
import { sequenceArray } from '@utils/utils'
import { sluggify } from '@utils/pf2e/utils'
import { createFeat } from '@src/items'
import { findItemWithSourceId } from '@utils/foundry/item'

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
        const templates: BaseCategoryTemplate[] = []
        const actorLanguages = actor.system.traits.languages.value
        const skills = SKILL_LONG_FORMS.filter(x => actor.skills[x]!.rank! < 1).map(x => ({ key: x }))
        const languages = LANGUAGE_LIST.filter(x => !actorLanguages.includes(x))
            .sort()
            .map(x => ({ key: x }))

        for (const entry of categories) {
            if (isScrollChainRecord(entry)) {
                const { type, category, label, items } = entry
                const slots: DropTemplate[] = []
                const spellSlot = (level: number): DropTemplate => {
                    const { name, uuid } = flags[category]?.[level - 1] ?? { name: '', uuid: '' }
                    return { type: 'drop', level, name, uuid, label: game.i18n.localize(`PF2E.SpellLevel${level}`) }
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
                templates.push(template)
            } else if (isTrainedSkill(entry)) {
                const { type, category, label } = entry
                const selected = flags[category] ?? ''
                const template: TrainedSkillTemplate = {
                    type,
                    category,
                    label,
                    rows: [{ type: 'select', options: skills, selected }],
                }
                templates.push(template)
            } else if (isAddedLanguage(entry)) {
                const { type, category, label } = entry
                const selected = flags[category] ?? ''
                const template: AddedLanguageTemplate = {
                    type,
                    category,
                    label,
                    rows: [{ type: 'select', options: languages, selected }],
                }
                templates.push(template)
            } else if (isCombatFlexibility(entry)) {
                const { type, category, label, items } = entry
                const selected = flags[category] ?? []
                // first feat
                const slots: DropTemplate[] = [
                    {
                        type: 'drop',
                        label: game.i18n.localize(`PF2E.Level8`),
                        name: selected[0]?.name ?? '',
                        uuid: selected[0]?.uuid ?? '',
                        level: 8,
                    },
                ]
                // second feat
                if (items[1])
                    slots.push({
                        type: 'drop',
                        label: game.i18n.localize(`PF2E.Level14`),
                        name: selected[1]?.name ?? '',
                        uuid: selected[1]?.uuid ?? '',
                        level: 14,
                    })
                const template: CombatFlexibilityTemplate = { type, category, label, rows: slots }
                templates.push(template)
            }
        }

        const rows: BaseCategoryTemplate[] = []
        const groups: BaseCategoryTemplate[] = []
        for (const template of templates) {
            if (template.rows.length > 1) groups.push(template)
            else rows.push(template)
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

        html.find<SearchTemplateButton>('[data-action=search]').on('click', this.#onSearch.bind(this))
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
            const typeError = () => localize.warn('error.drop.wrongDataType')

            const data: { type: string; uuid: string } = JSON.parse(dataString)
            if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return typeError()

            const item = await fromUuid<ItemPF2e>(data.uuid)
            if (!item) return typeError()

            switch (categoryType) {
                case 'scrollChain':
                    this.#onDropSpell(target, item, CATEGORY_SEARCH.scrollChain)
                    break
                case 'combatFlexibility':
                    this.#onDropFeat(target, item, CATEGORY_SEARCH.combatFlexibility)
                    break
            }
        } catch (error) {}
    }

    #onDropSpell(target: JQuery, item: ItemPF2e, { category = [] }: InitialSpellFilters = {}) {
        if (!item.isOfType('spell')) return localize.warn('error.drop.wrongType', { type: 'spell' })

        if (item.isCantrip && !category.includes('cantrip'))
            return localize.warn('error.drop.cannotBe', { type: 'spell', not: 'cantrip' })
        if (item.isRitual && !category.includes('ritual'))
            return localize.warn('error.drop.cannotBe', { type: 'spell', not: 'ritual' })
        if (item.isFocusSpell && !category.includes('focus'))
            return localize.warn('error.drop.cannotBe', { type: 'spell', not: 'focus' })

        if (item.level > Number(target.attr('data-level'))) return localize.warn('error.drop.wrongLevel', { type: 'spell' })

        this.#dropItem(target, item)
    }

    #onDropFeat(target: JQuery, item: ItemPF2e, { feattype = [], traits = [] }: InitialFeatFilters) {
        if (!item.isOfType('feat') || item.isFeature) return localize.warn('error.drop.wrongType', { type: 'feat' })
        if (!feattype.includes(item.featType)) return localize.warn('error.drop.cannotBe', { type: 'feat', not: item.featType })

        if (traits.length) {
            const itemTraits = item.system.traits.value
            for (const trait of traits) {
                if (!itemTraits.includes(trait)) return localize.warn('error.drop.wrongTrait', { type: 'feat', trait })
            }
        }

        if (item.level > Number(target.attr('data-level'))) return localize.warn('error.drop.wrongLevel', { type: 'feat' })

        this.#dropItem(target, item)
    }

    #dropItem(target: JQuery, item: ItemPF2e) {
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
        const fields = this.element.find('.window-content .content').find('input, select').toArray() as TemplateField[]
        const ruleItems = fields.some(field => RULE_TYPES.includes(field.dataset.type as RulesName)) ? getRuleItems(actor) : []

        for (const field of fields) {
            const type = field.dataset.type

            if (type === 'scrollChain') {
                const { uuid, category } = field.dataset
                const level = Number(field.dataset.level) as OneToTen
                const name = field.value

                if (uuid) {
                    const scroll = await createSpellScroll(uuid, level, true)
                    if (scroll) itemsToAdd.push(scroll)
                }

                flags[category] ??= []
                flags[category]![level - 1] = { name, uuid }
            } else if (type === 'combatFlexibility') {
                const { category, uuid, level } = field.dataset
                const name = field.value
                const index = level === '8' ? 0 : 1
                const parentUUID = getCategoryUUIDS(category)[index]

                if (parentUUID) {
                    const parent = findItemWithSourceId(actor, parentUUID) as FeatPF2e
                    const feat = await createFeat(uuid, parent)
                    if (feat) itemsToAdd.push(feat)
                }

                flags[category] ??= []
                flags[category]![index] = { name, uuid }
            } else {
                const category = field.dataset.category
                const uuid = getCategoryUUIDS(category)[0]
                const ruleItem = ruleItems.find(item => hasSourceId(item, uuid))
                if (!ruleItem) continue

                const rules = deepClone(ruleItem._source.system.rules)
                for (let i = rules.length - 1; i >= 0; i--) {
                    const rule = rules[i]
                    if ('pf2e-dailies' in rule) rules.splice(i, 1)
                }

                const selected = field.value
                const obj = {
                    uuid,
                    selected,
                    update: { _id: ruleItem.id, 'system.rules': rules },
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
        const pushUpdate = (type: 'skills' | 'languages', choices: SelectedObject[]) => {
            if (!choices.length) return

            if (message) message += '<hr />'

            const title = localize(`message.${type}`)
            message += `<p><strong>${title}</strong></p>`

            for (const { uuid, selected, update } of choices) {
                message += `<p>${chatUUID(uuid)} <span style="text-transform: capitalize;">${selected}</span></p>`
                updateData.push(update)
            }
        }

        pushUpdate('languages', selectedLanguages)
        pushUpdate('skills', selectedSkills)

        let featsMessage = ''
        let equipmentMessage = ''
        if (itemsToAdd.length) {
            const items = (await actor.createEmbeddedDocuments('Item', itemsToAdd)) as ItemPF2e[]
            for (const item of items) {
                const msg = `<p>${chatUUID(item.uuid)}</p>`
                if (item.isOfType('feat')) featsMessage += msg
                else equipmentMessage += msg

                const parentId = item.getFlag<string>('pf2e', 'grantedBy.id')
                if (parentId) {
                    const slug = sluggify(item.name, { camel: 'dromedary' })
                    const path = `flags.pf2e.itemGrants.${slug}`
                    updateData.push({ _id: parentId, [path]: { id: item.id, onDelete: 'detach' } })
                }
            }
        }

        if (featsMessage) {
            if (message) message += '<hr />'
            message += `<p><strong>${localize(`message.feats`)}</strong></p>`
            message += featsMessage
        }

        if (equipmentMessage) {
            if (message) message += '<hr />'
            message += `<p><strong>${localize(`message.items`)}</strong></p>`
            message += equipmentMessage
        }

        if (updateData.length) await actor.updateEmbeddedDocuments('Item', updateData)

        await setFlag(actor, 'saved', flags)

        message = `${localize('message.changes')}<hr>${message}`
        ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })

        this.close()
    }

    #onSearch(event: JQuery.ClickEvent<any, any, SearchTemplateButton>) {
        event.preventDefault()

        const data = event.currentTarget.dataset
        const level = Number(data.level)

        switch (data.type) {
            case 'scrollChain':
                this.#onSpellSearch({
                    ...CATEGORY_SEARCH.scrollChain,
                    level: sequenceArray<OneToTen>(1, level),
                })
                break
            case 'combatFlexibility':
                this.#onFeatSearch({
                    ...CATEGORY_SEARCH.combatFlexibility,
                    level: { min: 1, max: level },
                })
                break
        }
    }

    #onSpellSearch({ category = [], level = [] }: InitialSpellFilters = {}) {
        const filter: InitialSpellFilters = {
            category,
            classes: [],
            level,
            rarity: [],
            school: [],
            source: [],
            traditions: [],
            traits: [],
        }
        game.pf2e.compendiumBrowser.openTab('spell', filter)
    }

    #onFeatSearch({ feattype = [], level = {}, traits = [] }: InitialFeatFilters = {}) {
        const filter: InitialFeatFilters = {
            feattype,
            skills: [],
            rarity: [],
            source: [],
            traits,
            level,
        }
        game.pf2e.compendiumBrowser.openTab('feat', filter)
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
