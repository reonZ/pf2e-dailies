export function ErrorPF2e(message) {
    return Error(`PF2e System | ${message}`)
}

export function isObject(value) {
    return typeof value === 'object' && value !== null
}
