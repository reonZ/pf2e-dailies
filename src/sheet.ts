import { DailiesInterface } from '@apps/interface'
import { localize } from '@utils/foundry/localize'
import { getFlag } from '@utils/foundry/flags'
import { warn } from '@utils/foundry/notification'
import { hasAnyDaily } from './dailies'

export function renderCharacterSheetPF2e(sheet: CharacterSheetPF2e, html: JQuery) {
    const actor = sheet.actor
    if (!actor.isOwner || !hasAnyDaily(actor)) return

    const small = html.find('aside .sidebar .hitpoints .hp-small')
    small
        .append(`<a class="roll-icon dailies" data-tooltip="${localize('sheet.title')}"><i class="fas fa-mug-saucer"></i></a>`)
        .find('.dailies')
        .on('click', () => openDailiesInterface(actor))
}

function openDailiesInterface(actor: CharacterPF2e) {
    if (getFlag(actor, 'rested') !== true) return warn('error.unrested')
    new DailiesInterface(actor).render(true)
}
