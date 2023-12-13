import { utils } from '../../api'
import { capitalize, getFlag, hasLocalization, localize } from '../../module'
import { PredicatePF2e } from '../../pf2e/predicate'

const templateOrders = {
    select: 100,
    combo: 80,
    random: 60,
    alert: 40,
    input: 20,
    drop: 0,
}

export async function getTemplate({ children = [], key, item, prepare, label, rows = [] }) {
    const actor = this.actor
    const saved = (this.saved[key] = getFlag(actor, key) ?? {})
    const rowsObj = (this.rows[key] = {})
    const childrenObj = (this.children[key] = children.reduce((children, { slug, item }) => {
        children[slug] = item
        return children
    }, {}))

    const prepareArgs = {
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

    const template = {
        label: groupLabel ? game.i18n.localize(groupLabel) : item.name,
        rows: [],
    }

    for (const row of rows) {
        rowsObj[row.slug] = row

        const { type, slug, childPredicate = [], condition, label, save, unique } = row

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

        const rowTemplate = {
            label: rowLabel ? game.i18n.localize(rowLabel) : '',
            value,
            order: templateOrders[type],
            data: {
                type,
                daily: key,
                row: slug,
                ...(unique ? { unique } : ''),
            },
        }

        if (isComboRow(row) || isSelectRow(row) || isRandomRow(row)) {
            const tmp = (await getProcessedValue(row.options, dailyArgs)) ?? []
            if (type !== 'combo' && !tmp.length) continue

            const labelize = (typeof row.labelizer === 'function' && row.labelizer(dailyArgs)) || (value => capitalize(value))
            rowTemplate.options = tmp.map(value => (typeof value === 'string' ? { value, label: labelize(value) } : value))

            if (isComboRow(row)) {
                rowTemplate.selected = rowTemplate.value
                rowTemplate.data.input = savedRow?.input ?? true

                if (!rowTemplate.data.input && tmp.includes(rowTemplate.selected)) {
                    rowTemplate.value = labelize(rowTemplate.selected)
                }
            }
        } else if (isDropRow(row)) {
            rowTemplate.data.uuid = savedRow?.uuid ?? ''
        } else if (isAlerRow(row)) {
            rowTemplate.value = typeof row.message === 'function' ? await row.message(dailyArgs) : row.message
        }

        template.rows.push(rowTemplate)
    }

    return template
}

async function getProcessedValue(obj, args) {
    if (typeof obj === 'function') return await obj(args)
    return obj
}

function isComboRow(row) {
    return row.type === 'combo'
}

function isSelectRow(row) {
    return row.type === 'select'
}

function isRandomRow(row) {
    return row.type === 'random'
}

function isDropRow(row) {
    return row.type === 'drop'
}

function isAlerRow(row) {
    return row.type === 'alert'
}
