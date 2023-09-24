import { localizePath } from '../module'
import { createSpellDaily } from './spell'

export function tricksterAce() {
    const daily = createSpellDaily(
        'ace',
        'Compendium.pf2e.feats-srd.Item.POrE3ZgBRdBL9MsW',
        {
            category: ['cantrip', 'spell'],
            level: 4,
        },
        4
    )

    const row = daily.rows[0]
    row.filter.drop = item => {
        const castTime = item.system.time.value
        if (castTime.includes('hour') || (castTime.includes('min') && parseInt(castTime) > 10)) {
            return { error: localizePath('interface.error.drop.wrongSpellTime'), data: { time: '10 min' } }
        }
        return true
    }

    return daily
}
