import { getFlag, setFlag } from '~src/@utils/foundry/flags'
import { subLocalize } from '~src/@utils/foundry/i18n'
import { warn } from '~src/@utils/foundry/notifications'
import { flagsUpdatePath, templatePath } from '~src/@utils/foundry/path'
import { getScrollCompendiumUUID } from '~src/@utils/pf2e'
import { hasAllFeats } from '~src/feats'
import { createMessage, isValidSpellType, isValidTalismanType } from '~src/helpers'

const localize = subLocalize('app')

export class PF2eDailies extends Application {
    private _actor: CharacterPF2e

    constructor(actor: CharacterPF2e) {
        super({ id: `pf2e-dailies-${actor.id}` })
        this._actor = actor
    }

    static get defaultOptions(): ApplicationOptions {
        return mergeObject(super.defaultOptions, {
            title: localize('title'),
            template: templatePath('app.html'),
            height: 'auto',
            dragDrop: [
                {
                    dropSelector: '[name="spell"], [name="talisman"]',
                },
            ],
        })
    }

    getData(options?: Partial<ApplicationOptions>) {
        const actor = this._actor
        const saved = getFlag<ItemFlags>(actor, 'saved') ?? ({} as ItemFlags)
        const feats = hasAllFeats(actor)

        return {
            i18n: localize,
            feats,
            saved,
            level: actor.level,
            getTalismanValue: (values: ItemFlag[] | undefined, index: number, attr: 'name' | 'uuid') =>
                values?.[index]?.[attr] ?? '',
            getSpellValue: (values: ItemFlag[] | undefined, level: number, attr: 'name' | 'uuid') =>
                values?.[level - 1]?.[attr] ?? '',
            addOne: (v: number) => v + 1,
        }
    }

    activateListeners(html: JQuery<HTMLElement>): void {
        super.activateListeners(html)

        html.find<HTMLAnchorElement>('[data-type=spell] [data-action=search]').on('click', this.#onSpellSearch.bind(this))
        html.find<HTMLAnchorElement>('[data-type=talisman] [data-action=search]').on('click', this.#onTalismanSearch.bind(this))
        html.find<HTMLAnchorElement>('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find<HTMLButtonElement>('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find<HTMLButtonElement>('[data-action=cancel]').on('click', this.#onCancel.bind(this))
    }

    protected async _onDrop(event: ElementDragEvent) {
        const dataString = event.dataTransfer?.getData('text/plain')
        try {
            const input = $(event.target)
            const type = input.attr('name') as 'spell' | 'talisman'
            const typeLabel = game.i18n.localize(type === 'spell' ? 'PF2E.SpellLabel' : 'PF2E.TraitTalisman').toLowerCase()
            const typeError = () => warn('app.error.wrongType', { type: typeLabel })

            const data: { type: string; uuid: string } = JSON.parse(dataString)
            if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return typeError()

            const typeValidation = type === 'spell' ? isValidSpellType : isValidTalismanType
            const item = await fromUuid<ItemPF2e>(data.uuid)
            if (!typeValidation(item)) return typeError()

            const actor = this._actor
            const maxLevel = type === 'spell' ? Number(input.attr('data-level')) : Math.floor(actor.level / 2)
            if (item.level > maxLevel) return warn('app.error.wrongLevel', { type: typeLabel })

            input.attr('value', item.name)
            input.attr('data-uuid', item.uuid)
            input.nextAll('[data-action="clear"]').first().removeClass('disabled')
        } catch {}
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

    #onTalismanSearch(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        const actor = this._actor

        const filter: InitialEquipmentFilters = {
            armorTypes: [],
            weaponTypes: [],
            itemtypes: ['consumable'],
            rarity: [],
            source: [],
            traits: ['talisman'],
            levelRange: { min: 1, max: Math.floor(actor.level / 2) },
        }

        game.pf2e.compendiumBrowser.openTab('equipment', filter)
    }

    #onClear(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()
        const target = $(event.currentTarget)
        const input = target.prevAll('[name="spell"], [name="talisman"]').first()
        input.attr('value', '')
        input.attr('data-uuid', '')
        target.addClass('disabled')
    }

    #lock() {
        this.element.find('button').attr('disabled', 'true')
        this.element.find('a').addClass('disabled')
    }

    async #onAccept(event: JQuery.ClickEvent) {
        event.preventDefault()
        this.#lock()

        const actor = this._actor
        const flags = getFlag<ItemFlags>(actor, 'saved') ?? ({} as Partial<ItemFlags>)
        const groups = {} as ItemFlags
        const remove: ItemFlag[] = []
        const add: (ItemFlag & { type: 'spell' | 'talisman'; level: OneToTen; category: FeatGroup })[] = []
        let message = ''

        this.element.find('.window-content .groups .group').each((_, el) => {
            const group = $(el)
            const category = group.attr('data-category') as FeatGroup

            group.find<HTMLInputElement>('[name="spell"], [name="talisman"]').each((i, el) => {
                const input = $(el)
                const uuid = input.attr('data-uuid') as ItemUUID
                const level = Number(input.attr('data-level') || 0) as OneToTen
                const flag = flags[category]?.[i]
                const hasItem = !!flag?.itemId && !!actor.items.has(flag.itemId)

                let value: ItemFlag
                if (flag?.uuid === uuid && hasItem) {
                    value = flag
                } else {
                    const name = input.attr('value') as string
                    const type = input.attr('name') as 'spell' | 'talisman'
                    value = { name, uuid, itemId: uuid ? randomID() : '' }
                    if (hasItem) remove.push({ name, uuid: flag.uuid, itemId: flag.itemId })
                    if (uuid) add.push({ name, uuid, itemId: value.itemId, type, level, category })
                }

                groups[category] ??= []
                groups[category][i] = value
            })
        })

        if (remove.length) {
            const ids = remove.map(x => x.itemId)
            const items = await actor.deleteEmbeddedDocuments('Item', ids)
            message += createMessage('remove', items, true)
        }

        if (add.length) {
            const data: ConsumableSource[] = []
            const scrolls: (ConsumablePF2e | null)[] = []

            for (const entry of add) {
                const uuid = entry.uuid
                const level = entry.level
                const category = localize(entry.category)
                let item: ConsumableSource | undefined

                if (entry.type === 'talisman') {
                    item = (await fromUuid(uuid))?.toObject() as ConsumableSource
                    if (!item) continue

                    item.system.description.value = localize('item.talisman.description', {
                        category,
                        description: item.system.description.value,
                    })
                } else {
                    const scrollUUID = getScrollCompendiumUUID(level)
                    scrolls[level] ??= await fromUuid<ConsumablePF2e>(scrollUUID)

                    const spell = await fromUuid<SpellPF2e>(uuid)
                    item = scrolls[level]?.toObject() as unknown as ConsumableSource
                    if (!item || !spell) continue

                    item.name = localize('item.spell.name', { name: spell.name, level: level })
                    item.system.spell = spell.clone({ 'system.location.heightenedLevel': level }).toObject() as SpellSource
                    item.system.traits.value.push(...spell.traditions)
                    item.system.description.value = localize('item.spell.description', {
                        category,
                        uuid: uuid,
                        description: item.system.description.value,
                    })
                }

                item.name = `${item.name} **`
                setProperty(item, '_id', entry.itemId)
                setProperty(item, flagsUpdatePath('temporary'), true)
                data.push(item)
            }

            const items = await actor.createEmbeddedDocuments('Item', data, { keepId: true })
            message += createMessage('add', items as ItemPF2e[])
        }

        setFlag(actor, 'saved', groups)

        if (message) message = `${localize('message.changes')}<hr>${message}`
        else message = localize('message.noChanges')
        ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })

        this.close()
    }

    #onCancel(event: JQuery.ClickEvent) {
        event.preventDefault()
        this.close()
    }
}
