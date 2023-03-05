import { getSourceId } from '@utils/foundry/flags'
import { error } from '@utils/foundry/notification'
import { getSetting } from '@utils/foundry/settings'
import { utils } from './api'
import { TricksterAce } from './data/ace'
import { createScrollChain } from './data/chain'
import { createFeatDaily } from './data/feat'
import { combatFlexibility } from './data/flexibility'
import { createLanguageDaily } from './data/language'
import { mindSmith } from './data/mind'
import { getRations } from './data/rations'
import { createResistancelDaily } from './data/resistance'
import { scrollSavant } from './data/savant'
import { createTrainedLoreDaily, createTrainedSkillDaily } from './data/skill'
import { thaumaturgeTome } from './data/tome'
import { AsyncFunction } from '@utils/function'

const BUILTINS = [
    thaumaturgeTome,
    createTrainedSkillDaily('longevity', 'Compendium.pf2e.feats-srd.WoLh16gyDp8y9WOZ'), // Ancestral Longevity
    createTrainedSkillDaily('ageless', 'Compendium.pf2e.feats-srd.wylnETwIz32Au46y'), // Ageless Spirit
    createTrainedSkillDaily('memories', 'Compendium.pf2e.feats-srd.ptEOt3lqjxUnAW62'), // Ancient Memories
    createTrainedSkillDaily('studies', 'Compendium.pf2e.feats-srd.9bgl6qYWKHzqWZj0'), // Flexible Studies
    createTrainedLoreDaily('study', 'Compendium.pf2e.feats-srd.aLJsBBZzlUK3G8MW'), // Quick Study
    createLanguageDaily('linguistics', 'Compendium.pf2e.feats-srd.eCWQU16hRLfN1KaX'), // Ancestral Linguistics
    createLanguageDaily('borts', 'Compendium.pf2e.equipment-srd.iS7hAQMAaThHYE8g'), // Bort's Blessing
    createResistancelDaily(
        'elementalist',
        'Compendium.pf2e.feats-srd.tx9pkrpmtqe4FnvS',
        ['air', 'earth', 'fire', 'water'],
        'half',
        'elementalist'
    ), // Elementalist Dedication
    createResistancelDaily(
        'ganzi',
        'Compendium.pf2e.heritages.3reGfXH0S82hM7Gp',
        ['acid', 'electricity', 'sonic'],
        'half',
        'ganzi',
        true
    ), // Ganzi
    createFeatDaily('metamagical', 'Compendium.pf2e.classfeatures.89zWKD2CN7nRu2xp', {
        feattype: ['class'],
        traits: { values: ['metamagic', 'wizard'], conjunction: 'and' },
        level: 'half',
    }), // Metamagical Experimentation
    combatFlexibility,
    scrollSavant,
    createScrollChain('esoterica', [
        'Compendium.pf2e.feats-srd.OqObuRB8oVSAEKFR', // Scroll Esoterica
        'Compendium.pf2e.feats-srd.nWd7m0yRcIEVUy7O', // Elaborate Scroll Esoterica
        'Compendium.pf2e.feats-srd.LHjPTV5vP3MOsPPJ', // Grand Scroll Esoterica
    ]),
    createScrollChain('trickster', [
        'Compendium.pf2e.feats-srd.ROAUR1GhC19Pjk9C', // Basic Scroll Cache
        'Compendium.pf2e.feats-srd.UrOj9TROtn8nuxPf', // Expert Scroll Cache
        'Compendium.pf2e.feats-srd.lIg5Gzz7W70jfbk1', // Master Scroll Cache
    ]),
    TricksterAce,
    mindSmith,
] as unknown as Daily[]

type DailiesUUIDS = Map<ItemUUID, { daily: Daily; index?: number; condition?: BaseDailyConditionFunction }>

const BUILTINS_UUIDS: DailiesUUIDS = parseDailies(BUILTINS, 'dailies')
const UUIDS: DailiesUUIDS = new Map()

function parseDailies(dailies: Daily[], prefix: 'dailies' | 'custom') {
    const uuids: DailiesUUIDS = new Map()

    for (const original of dailies) {
        const daily = deepClone(original)

        try {
            const keyWithPrefix = `${prefix}.${daily.key}`

            uuids.set(daily.item.uuid, { daily, condition: daily.item.condition })

            daily.key = keyWithPrefix

            if (daily.children) {
                for (let i = 0; i < daily.children.length; i++) {
                    const { uuid, condition } = daily.children[i]!
                    uuids.set(uuid, { daily, index: i, condition })
                }
            }
        } catch (err) {
            error('error.unexpected')
            console.error(err)
            console.error(`The error occured during data gathering of ${prefix}.${daily.key}`)
        }
    }

    return uuids
}

export async function parseCustomDailies() {
    UUIDS.clear()

    const CUSTOM_DAILIES: Daily[] = []

    const customs = getSetting<SavedCustomDaily[]>('customDailies')
    for (const { key, code } of customs) {
        try {
            const fn = new AsyncFunction(code)
            const daily = await fn()
            CUSTOM_DAILIES.push(daily)
        } catch (err) {
            error('error.unexpected')
            console.error(err)
            console.error(`The error occured during call of custom function for ${key}`)
        }
    }

    for (const [uuid, daily] of BUILTINS_UUIDS.entries()) {
        UUIDS.set(uuid, daily)
    }

    const CUSTOM_UUIDS = parseDailies(CUSTOM_DAILIES, 'custom')
    for (const [uuid, daily] of CUSTOM_UUIDS.entries()) {
        UUIDS.set(uuid, daily)
    }
}

export function getDailies(actor: CharacterPF2e) {
    const dailies: Record<string, ReturnedDaily> = {}

    for (const item of actor.items) {
        const sourceId = getSourceId(item)
        if (!sourceId || (item.isOfType('physical') && item.isInvested === false)) continue

        const entry = UUIDS.get(sourceId)
        if (!entry) continue

        const { daily, index, condition } = entry
        try {
            if (typeof condition === 'function' && !condition({ actor, item, utils })) continue

            dailies[daily.key] ??= deepClone(daily) as ReturnedDaily

            if (index === undefined) {
                dailies[daily.key]!.item = item
            } else {
                dailies[daily.key]!.children![index]!.item = item
            }
        } catch (err) {
            error('error.unexpected')
            console.error(err)
            console.error(`The error occured during data gathering of ${daily.key}`)
        }
    }

    return Object.values(dailies).filter(daily => daily.item && daily.item instanceof Item)
}

export function getDailyFromSourceId(sourceId: ItemUUID) {
    return UUIDS.get(sourceId)?.daily
}

export function hasAnyDaily(actor: CharacterPF2e) {
    return actor.familiar || getRations(actor)?.uses.value || getDailies(actor).length
}
