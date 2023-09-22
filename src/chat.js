import { openDailiesInterface } from './api'
import { MODULE_ID, getChatMessageClass, getFlag, localize } from './module'

export function renderChatMessage(message, html) {
    const flag = getFlag(message, 'isWatch')
    if (!flag) return
    html.find('.message-content button').on('click', () => openDailiesInterface())
}

export function createWatchChatMessage() {
    let content = `<div>${localize('message.dailiesRequest.content')}</div>`
    content += `<button type="button" style="margin-top: 8px;">${localize('message.dailiesRequest.button')}</button>`
    getChatMessageClass().create({ content, flags: { [MODULE_ID]: { isWatch: true } } })
}
