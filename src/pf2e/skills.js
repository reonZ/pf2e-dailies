export function getTranslatedSkills() {
	return Object.entries(CONFIG.PF2E.skillList).reduce(
		(result, [key, value]) => {
			result[key] = game.i18n.localize(value).toLocaleLowerCase(game.i18n.lang);
			return result;
		},
		{},
	);
}
