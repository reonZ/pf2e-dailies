import { subLocalize } from './@utils/foundry/i18n'
import { PF2eDailies } from './apps/app'
import { hasAnyFeat } from './feats'

const localize = subLocalize('sheet')
const feats: FeatGroups = [
    ['scroll', 0],
    ['trickster', 0],
]

export function onRenderCharacterSheetPF2e(sheet: CharacterSheetPF2e, html: JQuery) {
    const actor = sheet.actor
    if (!hasAnyFeat(actor, feats)) return

    const title = localize('title')
    const link = `<a class="roll-icon dailies" title="${title}"><i class="fas fa-mug-saucer"></i></a>`
    html.find('aside .sidebar .hitpoints .hp-small')
        .append(link)
        .find('.dailies')
        .on('click', () => new PF2eDailies(actor).render(true))
}
