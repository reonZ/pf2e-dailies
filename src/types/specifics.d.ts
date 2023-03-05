type DailySavedDrop = { uuid: ItemUUID; name: string }
type DailySavedCombo = { selected: string; input: boolean }
type DailySavedValue = string | DailySavedDrop | DailySavedCombo
type DailySaved = Record<string, DailySavedValue>
type DailyCustom = Record<string, any>
type SelectOption = { value: string; label: string }
type DailySimplifiableValue = number | 'half' | 'level'
