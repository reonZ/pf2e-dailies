import { DailiesInterface } from '@apps/interface'
import { WEAPON_BASE_TYPES } from '@data/weapon'
import { MINDSMITH_WEAPON_UUID } from '@src/categories'
import { subLocalize } from '@utils/foundry/localize'

const localize = subLocalize('dialog')

export async function onAlert(this: DailiesInterface, event: JQuery.ClickEvent) {
    event.preventDefault()

    const input = event.currentTarget.previousElementSibling as AlertTemplateField
    const { type } = input.dataset

    if (type === 'mindSmith') {
        onWeaponAlert.call(this)
    }
}

async function onWeaponAlert(this: DailiesInterface) {
    let content = localize('weapon.flavor')
    content += '<hr />'

    for (const key of ['0', '1', '2', '3']) {
        const label = localize(`weapon.option.${key}`)
        content += `<label><input type="radio" name="type" value="${key}">${label}</label>`
    }

    await Dialog.wait(
        {
            title: localize('weapon.title'),
            content,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-save"></i>',
                    label: localize('weapon.accept'),
                    callback: onWeaponSelected.bind(this),
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: localize('weapon.cancel'),
                },
            },
            close: () => false,
        },
        {},
        { id: 'pf2e-dailies-weapon', width: 600 }
    )
}

async function onWeaponSelected(this: DailiesInterface, html: JQuery) {
    const selection = html.find('[name=type]:checked').val() as keyof typeof WEAPON_BASE_TYPES
    if (!selection) return localize.warn('weapon.error.noSelection')

    const weapon = (await fromUuid<WeaponPF2e>(MINDSMITH_WEAPON_UUID))?.toObject()
    if (!weapon) return localize.warn('weapon.error.missing')

    const stats = WEAPON_BASE_TYPES[selection]

    setProperty(weapon, 'system.damage.die', stats.die)
    setProperty(weapon, 'system.traits.value', stats.traits.slice())
    setProperty(weapon, 'system.usage.value', stats.usage)

    await this.actor.createEmbeddedDocuments('Item', [weapon])

    this.render()
}
