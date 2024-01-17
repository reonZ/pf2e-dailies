export function ErrorPF2e(message) {
	return Error(`PF2e System | ${message}`);
}

export function isObject(value) {
	return typeof value === "object" && value !== null;
}

export function sluggify(text, options) {
	return game.pf2e.system.sluggify(text, options);
}

export function setHasElement(set, value) {
	return set.has(value);
}

export function itemIsOfType(item, ...types) {
	return types.some((t) =>
		t === "physical"
			? setHasElement(PHYSICAL_ITEM_TYPES, item.type)
			: item.type === t,
	);
}
