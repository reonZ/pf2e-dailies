import { createFeatDaily } from "../data/feat";
import { createLanguageDaily } from "../data/language";
import { createResistancelDaily } from "../data/resistance";
import { createTrainedLoreDaily, createTrainedSkillDaily } from "../data/skill";
import { createSpellDaily } from "../data/spell";
import { EXT_VERSION } from "../main";
import {
	AsyncFunction,
	error,
	getSetting,
	setSetting,
	subLocalize,
	templatePath,
	warn,
} from "../module";
import { flexibility } from "./custom/flexibility";
import { mind } from "./custom/mind";
import { savant } from "./custom/savant";
import { tome } from "./custom/tome";

const localize = subLocalize("customs");

const TEMPLATES = [
	"default",
	"trainedSkill",
	"trainedLore",
	"language",
	"resistance",
	"feat",
	"spell",
];
const EXAMPLES = ["flexibility", "savant", "tome", "mind"];

export class DailyCustoms extends FormApplication {
	static get defaultOptions() {
		return mergeObject(FormApplication.defaultOptions, {
			id: "pf2e-dailies-customs",
			title: localize("title"),
			template: templatePath("customs.hbs"),
			submitOnChange: false,
			submitOnClose: false,
			closeOnSubmit: false,
			scrollY: [".left .list"],
		});
	}

	async _updateObject(event, formData) {}

	async getData(options) {
		const customs = getSetting("customDailies");
		const code = customs.find(
			(custom) => custom.key === this._selectedDaily,
		)?.code;
		const template = this._selectedTemplate;
		const extension = game.modules.get("pf2e-dailies-ext");
		const newVersion =
			extension?.active && isNewerVersion(EXT_VERSION, extension.version)
				? { version: EXT_VERSION }
				: "";

		return mergeObject(super.getData(options), {
			i18n: localize,
			template,
			templates: TEMPLATES,
			daily: this._selectedDaily,
			code,
			customs,
			examples: EXAMPLES,
			isExample: EXAMPLES.includes(template),
			monaco: extension?.active,
			newVersion,
		});
	}

	activateListeners(html) {
		super.activateListeners(html);

		this._monaco?.dispose();

		const monaco = game.modules.get("pf2e-dailies-ext")?.api;
		const area = html.find(".code")[0];
		if (monaco && area) {
			const element = html.find(".monaco .placeholder")[0];
			this._monaco = monaco.createEditor(element, area.value);
			this._monaco.onDidChangeModelContent(
				debounce(() => {
					area.value = this._monaco.getValue();
				}, 200),
			);
		} else {
			this._monaco = null;
		}

		html
			.find("[data-action=select-template]")
			.on("change", this.#onSelectTemplate.bind(this));
		html
			.find("[data-action=create-template]")
			.on("click", this.#onCreateTemplate.bind(this));
		html
			.find("[data-action=create-daily]")
			.on("click", this.#onCreateDaily.bind(this));

		html.find(".row[data-key]").on("click", this.#onSelectDaily.bind(this));
		html
			.find("[data-action=delete-daily]")
			.on("click", this.#onDeleteDaily.bind(this));

		html
			.find("[data-action=save-code]")
			.on("click", this.#onSaveCode.bind(this));
	}

	get code() {
		const element = this.form.querySelector(".window-content .code");
		return element?.value;
	}

	async #onSaveCode(event) {
		event.preventDefault();

		const code = this.code;
		const selected = this._selectedDaily;

		if (!selected || !code) return;

		const customs = getSetting("customDailies");
		const stipped = customs.filter((custom) => custom.key !== selected);

		try {
			const fn = new AsyncFunction(code);
			const daily = await fn();
			const key = daily.key;

			if (typeof key !== "string") return warn("invalidKey");
			if (stipped.find((custom) => custom.key === key))
				return warn("duplicate");

			const index = customs.findIndex((custom) => custom.key === selected);
			if (index < 0) return;

			customs.splice(index, 1, { key, code });
			await setSetting("customDailies", customs);

			localize.info("saved", { daily: key });
			this._selectedDaily = key;
			this.render();
		} catch (err) {
			error("error.unexpected");
			console.error(err);
			console.error(
				`The error occured while testing the custom daily ${selected}`,
			);
		}
	}

	async #onDeleteDaily(event) {
		event.preventDefault();
		event.stopPropagation();

		const remove = await Dialog.confirm({
			title: localize("delete.title"),
			content: localize("delete.content"),
		});

		if (!remove) return;

		const key = event.currentTarget.dataset.key;
		const customs = getSetting("customDailies").filter(
			(custom) => custom.key !== key,
		);

		await setSetting("customDailies", customs);
		localize.info("deleted", { daily: key });
		this.#onCreateDaily();
	}

	#onCreateDaily() {
		this._selectedDaily = "";
		this._selectedTemplate = "default";
		this.render();
	}

	#onSelectDaily(event) {
		event.preventDefault();

		this._selectedDaily = event.currentTarget.dataset.key;
		this.render();
	}

	async #onCreateTemplate(event) {
		event.preventDefault();
		const template = this._selectedTemplate;

		const customs = getSetting("customDailies");
		const formData = new FormData(this.form);
		const data = Object.fromEntries(formData);
		const isExample = EXAMPLES.includes(template);
		let { key, uuid, label } = data;

		if (isExample) {
			key = template;
		} else if (!key || !uuid) {
			return localize.warn("template.noEmpty");
		}

		if (customs.find((custom) => custom.key === key))
			return warn("error.duplicate");

		let code;

		if (template === "trainedSkill") {
			const daily = createTrainedSkillDaily(key, uuid, label);
			code = this.#stringifyDaily(daily, { key, uuid, label }, "SkillGenerics");
		} else if (template === "trainedLore") {
			const daily = createTrainedLoreDaily(key, uuid, label);
			code = this.#stringifyDaily(daily, { key, uuid, label }, "SkillGenerics");
		} else if (template === "language") {
			const daily = createLanguageDaily(key, uuid, label);
			code = this.#stringifyDaily(
				daily,
				{ key, uuid, label },
				"LanguageGenerics",
			);
		} else if (template === "resistance") {
			const resistance = simplyfiable(data.resistance);
			const resistances = splitList(data.resistances);

			if (resistance === "" || !resistances.length)
				return localize.warn("template.noEmpty");
			if (typeof resistance === "number" && resistance < 1)
				return localize.warn("template.badResistance");

			const daily = createResistancelDaily(
				key,
				uuid,
				resistances,
				resistance,
				label,
			);
			code = this.#stringifyDaily(
				daily,
				{ key, uuid, label, resistance, resistances },
				"ResistanceGenerics",
			);
		} else if (template === "feat") {
			const traits = splitList(data.traits);
			const filter = {
				category: splitList(data.category),
				level: simplyfiable(data.level) || { min: 0, max: 20 },
			};
			if (traits.length) filter.traits = traits;
			const daily = createFeatDaily(key, uuid, filter, label);
			code = this.#stringifyDaily(daily, { key, uuid, label }, "FeatGenerics");
		} else if (template === "spell") {
			const level = Number(data.level) || undefined;
			const traits = splitList(data.traits);
			let levels = data.levels.split(",").map((x) => x.trim());
			if (levels.length === 1) {
				levels = simplyfiable(levels[0]);
			} else {
				levels = levels
					.filter((x) => x)
					.map((x) => Number(x))
					.filter((x) => !Number.isNaN(x));
			}
			const filter = {
				category: splitList(data.category),
				traditions: splitList(data.traditions),
				level: levels || [],
			};
			if (traits.length) filter.traits = traits;
			const daily = createSpellDaily(key, uuid, filter, level, label);
			code = this.#stringifyDaily(
				daily,
				{ key, uuid, label, level },
				"SpellGenerics",
			);
		} else if (template === "tome") {
			code = tome;
		} else if (template === "flexibility") {
			code = flexibility;
		} else if (template === "savant") {
			code = savant;
		} else if (template === "mind") {
			code = mind;
		} else {
			const daily = { key, label, item: { uuid }, rows: [], process: () => {} };
			code = this.#stringifyDaily(daily, { key, uuid, label });
		}

		customs.push({ key, code });
		await setSetting("customDailies", customs);

		this._selectedDaily = key;
		this.render();
	}

	#stringifyDaily(daily, args, type) {
		const placeholder = "____PLACEHOLDER____";
		const fns = [];

		let str = JSON.stringify(
			daily,
			(_, value) => {
				if (typeof value === "function") {
					fns.push(value);
					return placeholder;
				}
				return value;
			},
			4,
		);

		str = str.replace(new RegExp(`"${placeholder}"`, "g"), () => {
			const fn = fns.shift()?.toString();
			return fn?.replace(/( {5,})/g, (match) => match.slice(4)) ?? "";
		});

		let strArgs = "";
		for (const [key, value] of Object.entries(args)) {
			if (typeof value === "string") strArgs += `const ${key} = '${value}';\n`;
			else if (typeof value === "object")
				strArgs += `const ${key} = ${JSON.stringify(value)};\n`;
			else strArgs += `const ${key} = ${value};\n`;
		}

		const typing = type ? `Daily<${type}>` : "Daily";
		return `${strArgs}\n/** @type {${typing}} */\nconst daily = ${str};\n\nreturn daily;`;
	}

	#onSelectTemplate(event) {
		event.preventDefault();

		this._selectedDaily = "";
		this._selectedTemplate = event.currentTarget.value;

		this.render();
	}
}

function splitList(list) {
	return list
		.split(",")
		.map((x) => x.trim())
		.filter((x) => x);
}

function simplyfiable(value) {
	if (typeof value === "number") return value;

	const trimmed = value.trim();
	if (trimmed === "level" || trimmed === "half") return trimmed;

	const numbered = Number(trimmed);
	return Number.isNaN(numbered) ? "" : numbered;
}
