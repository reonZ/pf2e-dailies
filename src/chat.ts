import { localize } from '@utils/foundry/localize'
import { getFlag } from '@utils/foundry/flags'
import { MODULE_ID } from './main'
import { openDailiesInterface } from './api'

export function renderChatMessage(message: ChatMessagePF2e, html: JQuery) {
    const flag = getFlag<boolean>(message, 'isWatch')
    if (!flag) return
    html.find('.message-content button').on('click', () => openDailiesInterface())
}

export function createWatchChatMessage() {
    let content = `<div>${localize('message.dailiesRequest.content')}</div>`
    content += `<button type="button" style="margin-top: 8px;">${localize('message.dailiesRequest.button')}</button>`
    ChatMessage.create({ content, flags: { [MODULE_ID]: { isWatch: true } } })
}
