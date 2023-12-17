export function ErrorPF2e(message) {
    return Error(`PF2e System | ${message}`)
}

export function isObject(value) {
    return typeof value === 'object' && value !== null
}

export function sluggify(text, options) {
    return game.pf2e.system.sluggify(text, options)
}
