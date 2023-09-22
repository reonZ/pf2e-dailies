import { ErrorPF2e } from './utils'

const wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`
const nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`
const nonWordCharacterRE = new RegExp(nonWordCharacter, 'gu')

const wordBoundary = String.raw`(?:${wordCharacter})(?=${nonWordCharacter})|(?:${nonWordCharacter})(?=${wordCharacter})`
const nonWordBoundary = String.raw`(?:${wordCharacter})(?=${wordCharacter})`
const lowerCaseLetter = String.raw`\p{Lowercase_Letter}`
const upperCaseLetter = String.raw`\p{Uppercase_Letter}`
const lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, 'gu')

const nonWordCharacterHyphenOrSpaceRE = /[^-\p{White_Space}\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu
const upperOrWordBoundariedLowerRE = new RegExp(`${upperCaseLetter}|(?:${wordBoundary})${lowerCaseLetter}`, 'gu')

export function sluggify(text, { camel = null } = {}) {
    // Sanity check
    if (typeof text !== 'string') {
        console.warn('Non-string argument passed to `sluggify`')
        return ''
    }

    switch (camel) {
        case null:
            return text
                .replace(lowerCaseThenUpperCaseRE, '$1-$2')
                .toLowerCase()
                .replace(/['’]/g, '')
                .replace(nonWordCharacterRE, ' ')
                .trim()
                .replace(/[-\s]+/g, '-')
        case 'bactrian': {
            const dromedary = sluggify(text, { camel: 'dromedary' })
            return dromedary.charAt(0).toUpperCase() + dromedary.slice(1)
        }
        case 'dromedary':
            return text
                .replace(nonWordCharacterHyphenOrSpaceRE, '')
                .replace(/[-_]+/g, ' ')
                .replace(upperOrWordBoundariedLowerRE, (part, index) => (index === 0 ? part.toLowerCase() : part.toUpperCase()))
                .replace(/\s+/g, '')
        default:
            throw ErrorPF2e("I don't think that's a real camel.")
    }
}
