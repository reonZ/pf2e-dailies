import { DailiesInterface } from '@apps/interface'
import { utils } from '@src/api'
import { getFlag } from '@utils/foundry/flags'
import { hasLocalization, localize } from '@utils/foundry/localize'
import { PredicatePF2e } from '@utils/pf2e/predicate'
import { capitalize } from '@utils/string'

const templateOrders: Record<DailyRowType, number> = {
    select: 100,
    combo: 80,
    random: 60,
    alert: 40,
    input: 20,
    drop: 0,
}

export async function getTemplate(
    this: DailiesInterface,
    { children = [], key, item, prepare, label, rows = [] }: ReturnedDaily
) {
    const actor = this.actor
    const saved = (this.saved[key] = getFlag<DailySaved>(actor, key) ?? {})
    const rowsObj: Record<string, DailyRow> = (this.rows[key] = {})
    const childrenObj = (this.children[key] = children.reduce((children, { slug, item }) => {
        children[slug] = item
        return children
    }, {} as DailyValueArgs['children']))

    const prepareArgs: DailyPrepareArgs = {
        actor,
        item,
        children: childrenObj,
        utils,
    }

    const custom = (this.custom[key] = (prepare && (await prepare(prepareArgs))) || {})

    const dailyArgs = (this.dailyArgs[key] = {
        ...prepareArgs,
        custom,
    })

    let groupLabel = await getProcessedValue(label, dailyArgs)
    const labeled = groupLabel ? `label.${groupLabel}` : key.startsWith('dailies.') ? `label.${key.slice(8)}` : undefined
    if (labeled && hasLocalization(labeled)) groupLabel = localize(labeled)

    const predicates = (this.predicate[key] = children.filter(child => child.item).map(child => child.slug))

    const template: DailyTemplate = {
        label: groupLabel ? game.i18n.localize(groupLabel) : item.name,
        rows: [],
    }

    for (const row of rows) {
        rowsObj[row.slug] = row

        const { type, slug, childPredicate = [], condition, label, save } = row

        if (childPredicate.length && !PredicatePF2e.test(childPredicate, predicates)) continue
        if (condition && !(await condition(dailyArgs))) continue

        const savedRow = save === false || type === 'random' ? undefined : saved[slug]
        const rowLabel = await getProcessedValue(label, dailyArgs)
        const value =
            savedRow === undefined
                ? ''
                : typeof savedRow !== 'object'
                ? savedRow
                : 'name' in savedRow
                ? savedRow.name
                : savedRow.selected

        const rowTemplate: DailyRowTemplate = {
            label: rowLabel ? game.i18n.localize(rowLabel) : '',
            value,
            order: templateOrders[type],
            data: {
                type,
                daily: key,
                row: slug,
            },
        }

        if (isComboRow(row) || isSelectRow(row) || isRandomRow(row)) {
            const tmp = (await getProcessedValue(row.options, dailyArgs)) ?? []
            if (type !== 'combo' && !tmp.length) continue

            const labelize =
                (typeof row.labelizer === 'function' && row.labelizer(dailyArgs)) || ((value: string) => capitalize(value))
            rowTemplate.options = tmp.map(value => (typeof value === 'string' ? { value, label: labelize(value) } : value))

            if (isComboRow(row)) {
                rowTemplate.selected = rowTemplate.value
                rowTemplate.data.input = (savedRow as DailySavedCombo | undefined)?.input ?? true

                if (!rowTemplate.data.input && tmp.includes(rowTemplate.selected)) {
                    rowTemplate.value = labelize(rowTemplate.selected)
                }
            }
        } else if (isDropRow(row)) {
            rowTemplate.data.uuid = (savedRow as DailySavedDrop | undefined)?.uuid ?? ''
        } else if (isAlerRow(row)) {
            rowTemplate.value = typeof row.message === 'function' ? await row.message(dailyArgs) : row.message
        }

        template.rows.push(rowTemplate)
    }

    return template
}

async function getProcessedValue<T extends any, R = T extends (...args: any[]) => infer R ? R : T>(obj: T, args: DailyValueArgs) {
    if (typeof obj === 'function') return (await obj(args)) as Promise<R>
    return obj as R
}

function isComboRow(row: DailyRow): row is DailyRowCombo {
    return row.type === 'combo'
}

function isSelectRow(row: DailyRow): row is DailyRowSelect {
    return row.type === 'select'
}

function isRandomRow(row: DailyRow): row is DailyRowRandom {
    return row.type === 'random'
}

function isDropRow(row: DailyRow): row is DailyRowDrop {
    return row.type === 'drop'
}

function isAlerRow(row: DailyRow): row is DailyRowAlert {
    return row.type === 'alert'
}
