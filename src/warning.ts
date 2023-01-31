import { getFlag } from './@utils/foundry/flags'
import { registerUpstreamHook } from './@utils/foundry/hook'
import { subLocalize } from './@utils/foundry/i18n'

const localize = subLocalize('warning')

export function setWarning(enable: boolean) {
    if (enable) {
        registerUpstreamHook('dropCanvasData', onDropCanvasData)
        registerUpstreamHook('dropActorSheetData', onDropActorSheetData)
    } else {
        Hooks.off('dropCanvasData', onDropCanvasData)
        Hooks.off('dropActorSheetData', onDropActorSheetData)
    }
}

function onDropCanvasData(canvas: Canvas, data: DropCanvasData) {
    checkForWarning(data)
}

function onDropActorSheetData(target: ActorPF2e, targetSheet: ActorSheetPF2e, data: DropData) {
    if (data.actorId === target.id) return
    checkForWarning(data)
}

function checkForWarning(data: { uuid?: string; type?: string }) {
    if (data.type !== 'Item' || !data.uuid) return

    const item = fromUuidSync(data.uuid) as ItemPF2e
    if (!item || !getFlag<boolean>(item, 'temporary')) return

    const content = `<p class="dailies-center">${localize('message')}</p>`
    Dialog.prompt({
        title: localize('title'),
        label: localize('label'),
        content,
        rejectClose: false,
        options: { width: 320 },
    })
}
