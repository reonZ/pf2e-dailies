import { localizePath } from '@utils/foundry/localize'
import { createSpellDaily, SpellGenerics } from './spell'

export const TricksterAce = (() => {
    const daily = createSpellDaily(
        'ace',
        'Compendium.pf2e.feats-srd.POrE3ZgBRdBL9MsW',
        {
            category: ['cantrip', 'spell'],
            level: 4,
        },
        4
    )

    const row = daily.rows![0] as DailyRowDropSpell<SpellGenerics>
    row.filter.drop = item => {
        const castTime = item.system.time.value
        if (castTime.includes('hour') || (castTime.includes('min') && parseInt(castTime) > 10)) {
            return { error: localizePath('interface.error.drop.wrongSpellTime'), data: { time: '10 min' } }
        }
        return true
    }

    return daily
})()
