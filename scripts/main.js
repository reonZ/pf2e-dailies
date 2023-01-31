var $a58a848730b694bb$export$2e2bcd8739ae039 = "pf2e-dailies";



function $7a9da4a58a01538c$export$f6ed52839c6955bc(...path) {
    return `${0, $a58a848730b694bb$export$2e2bcd8739ae039}.settings.${path.join(".")}`;
}
function $7a9da4a58a01538c$export$79b67f6e2f31449(...path) {
    return `flags.${0, $a58a848730b694bb$export$2e2bcd8739ae039}.${path.join("/")}`;
}
function $7a9da4a58a01538c$export$bdd507c72609c24e(...path) {
    path = path.filter((x)=>typeof x === "string");
    return `modules/${0, $a58a848730b694bb$export$2e2bcd8739ae039}/templates/${path.join("/")}`;
}
function $7a9da4a58a01538c$export$6d1a79e7c04100c2(...path) {
    return `modules/${0, $a58a848730b694bb$export$2e2bcd8739ae039}/images/${path.join("/")}`;
}


function $c143594d021ef19f$export$8206e8d612b3e63(key) {
    return game.settings.get((0, $a58a848730b694bb$export$2e2bcd8739ae039), key);
}
function $c143594d021ef19f$export$61fd6f1ddd0c20e2(key, value) {
    return game.settings.set((0, $a58a848730b694bb$export$2e2bcd8739ae039), key, value);
}
function $c143594d021ef19f$export$3bfe3819d89751f0(options) {
    const name = options.name;
    options.scope = options.scope ?? "world";
    options.config = options.config ?? false;
    if (options.config) {
        options.name = (0, $7a9da4a58a01538c$export$f6ed52839c6955bc)(name, "name");
        options.hint = (0, $7a9da4a58a01538c$export$f6ed52839c6955bc)(name, "hint");
    }
    if (Array.isArray(options.choices)) options.choices = options.choices.reduce((choices, choice)=>{
        choices[choice] = (0, $7a9da4a58a01538c$export$f6ed52839c6955bc)(name, "choices", choice);
        return choices;
    }, {});
    game.settings.register((0, $a58a848730b694bb$export$2e2bcd8739ae039), name, options);
}
function $c143594d021ef19f$export$cd2f7161e4d70860(options) {
    const name = options.name;
    options.name = (0, $7a9da4a58a01538c$export$f6ed52839c6955bc)("menus", name, "name");
    options.label = (0, $7a9da4a58a01538c$export$f6ed52839c6955bc)("menus", name, "label");
    options.hint = (0, $7a9da4a58a01538c$export$f6ed52839c6955bc)("menus", name, "hint");
    options.restricted = options.restricted ?? true;
    options.icon = options.icon ?? "fas fa-cogs";
    game.settings.registerMenu((0, $a58a848730b694bb$export$2e2bcd8739ae039), name, options);
}
function $c143594d021ef19f$export$8cb4a6769fa1780e() {
    return game.settings.get("core", "combatTrackerConfig");
}



function $87d8485a68ef7966$export$b3bd0bc58e36cd63(key, data) {
    key = `${0, $a58a848730b694bb$export$2e2bcd8739ae039}.${key}`;
    if (data) return game.i18n.format(key, data);
    return game.i18n.localize(key);
}
function $87d8485a68ef7966$export$a2435eff6fb7f6c1(subKey) {
    const fn = (key, data)=>$87d8485a68ef7966$export$b3bd0bc58e36cd63(`${subKey}.${key}`, data);
    Object.defineProperty(fn, "key", {
        get () {
            return subKey;
        },
        enumerable: false,
        configurable: false
    });
    return fn;
}



function $f5e8fbc5299fcdea$export$eb8e976fd8646538(doc) {
    // @ts-ignore
    return !!doc.flags && (0, $a58a848730b694bb$export$2e2bcd8739ae039) in doc.flags;
}
function $f5e8fbc5299fcdea$export$a19b74191e00c5e(doc, key, ...keys) {
    keys.unshift(key);
    return doc.getFlag((0, $a58a848730b694bb$export$2e2bcd8739ae039), keys.join("."));
}
function $f5e8fbc5299fcdea$export$5e165df1e30a1331(doc, key, value) {
    return doc.setFlag((0, $a58a848730b694bb$export$2e2bcd8739ae039), key, value);
}




function $c5fee9ae913138c0$export$5e14cdade93d6f7b(str, arg1, arg2, arg3) {
    const type = typeof arg1 === "string" ? arg1 : "info";
    const data = typeof arg1 === "object" ? arg1 : typeof arg2 === "object" ? arg2 : undefined;
    const permanent = typeof arg1 === "boolean" ? arg1 : typeof arg2 === "boolean" ? arg2 : arg3 ?? false;
    ui.notifications.notify((0, $87d8485a68ef7966$export$b3bd0bc58e36cd63)(str, data), type, {
        permanent: permanent
    });
}
function $c5fee9ae913138c0$export$c106dd0671a0fc2d(str, arg1, arg2) {
    $c5fee9ae913138c0$export$5e14cdade93d6f7b(str, "warning", arg1, arg2);
}
function $c5fee9ae913138c0$export$a80b3bd66acc52ff(str, arg1, arg2) {
    $c5fee9ae913138c0$export$5e14cdade93d6f7b(str, "info", arg1, arg2);
}
function $c5fee9ae913138c0$export$a3bc9b8ed74fc(str, arg1, arg2) {
    $c5fee9ae913138c0$export$5e14cdade93d6f7b(str, "error", arg1, arg2);
}



/** Check if an element is present in the provided set. Especially useful for checking against literal sets */ function $06ea898bdee42455$export$7fd671bc170c6856(set, value) {
    return set.has(value);
}


const $07f88a1a2cd9bae4$export$c6f5f26a78b4295b = new Set([
    "armor",
    "backpack",
    "book",
    "consumable",
    "equipment",
    "treasure",
    "weapon"
]);
const $07f88a1a2cd9bae4$export$12237db074fd27c0 = new Map([
    [
        -1,
        13
    ],
    [
        0,
        14
    ],
    [
        1,
        15
    ],
    [
        2,
        16
    ],
    [
        3,
        18
    ],
    [
        4,
        19
    ],
    [
        5,
        20
    ],
    [
        6,
        22
    ],
    [
        7,
        23
    ],
    [
        8,
        24
    ],
    [
        9,
        26
    ],
    [
        10,
        27
    ],
    [
        11,
        28
    ],
    [
        12,
        30
    ],
    [
        13,
        31
    ],
    [
        14,
        32
    ],
    [
        15,
        34
    ],
    [
        16,
        35
    ],
    [
        17,
        36
    ],
    [
        18,
        38
    ],
    [
        19,
        39
    ],
    [
        20,
        40
    ],
    [
        21,
        42
    ],
    [
        22,
        44
    ],
    [
        23,
        46
    ],
    [
        24,
        48
    ],
    [
        25,
        50
    ]
]);
const $07f88a1a2cd9bae4$export$3db6e09beb50ed02 = new Map([
    [
        "incredibly easy",
        -10
    ],
    [
        "very easy",
        -5
    ],
    [
        "easy",
        -2
    ],
    [
        "normal",
        0
    ],
    [
        "hard",
        2
    ],
    [
        "very hard",
        5
    ],
    [
        "incredibly hard",
        10
    ]
]);
const $07f88a1a2cd9bae4$export$e1912d3e02f0714c = new Set([
    "arcane",
    "divine",
    "occult",
    "primal"
]);
function $07f88a1a2cd9bae4$export$3b19b78776a9c55c(dc, adjustment = "normal") {
    return dc + ($07f88a1a2cd9bae4$export$3db6e09beb50ed02.get(adjustment) ?? 0);
}
function $07f88a1a2cd9bae4$export$49278407fc99568c(rarity = "common") {
    if (rarity === "uncommon") return "hard";
    else if (rarity === "rare") return "very hard";
    else if (rarity === "unique") return "incredibly hard";
    else return "normal";
}
function $07f88a1a2cd9bae4$export$285e1d124f214ce6(dc, rarity = "common") {
    return $07f88a1a2cd9bae4$export$3b19b78776a9c55c(dc, $07f88a1a2cd9bae4$export$49278407fc99568c(rarity));
}
function $07f88a1a2cd9bae4$export$bcb07a78a2f89083(level, { proficiencyWithoutLevel: proficiencyWithoutLevel = false , rarity: rarity = "common"  } = {}) {
    // assume level 0 if garbage comes in. We cast level to number because the backing data may actually have it
    // stored as a string, which we can't catch at compile time
    const dc = $07f88a1a2cd9bae4$export$12237db074fd27c0.get(level) ?? 14;
    if (proficiencyWithoutLevel) // -1 shouldn't be subtracted since it's just
    // a creature level and not related to PC levels
    return $07f88a1a2cd9bae4$export$285e1d124f214ce6(dc - Math.max(level, 0), rarity);
    else return $07f88a1a2cd9bae4$export$285e1d124f214ce6(dc, rarity);
}
/** Extract all traits from an item, that match a magic tradition */ function $07f88a1a2cd9bae4$var$getMagicTraditions(item) {
    const traits = item.system.traits.value;
    return new Set(traits.filter((t)=>(0, $06ea898bdee42455$export$7fd671bc170c6856)($07f88a1a2cd9bae4$export$e1912d3e02f0714c, t)));
}
function $07f88a1a2cd9bae4$export$88dab0cc25983d19(item, baseDc, notMatchingTraditionModifier) {
    const result = {
        occult: baseDc,
        primal: baseDc,
        divine: baseDc,
        arcane: baseDc
    };
    const traditions = $07f88a1a2cd9bae4$var$getMagicTraditions(item);
    for (const key of $07f88a1a2cd9bae4$export$e1912d3e02f0714c)// once an item has a magic tradition, all skills
    // that don't match the tradition are hard
    if (traditions.size > 0 && !traditions.has(key)) result[key] = baseDc + notMatchingTraditionModifier;
    return {
        arc: result.arcane,
        nat: result.primal,
        rel: result.divine,
        occ: result.occult
    };
}
function $07f88a1a2cd9bae4$export$eac0396674c51d5e(item) {
    return item.traits.has("cursed") ? "unique" : item.rarity;
}
function $07f88a1a2cd9bae4$export$550a429caca7a4dc(item, { proficiencyWithoutLevel: proficiencyWithoutLevel = false , notMatchingTraditionModifier: notMatchingTraditionModifier  }, noDC = false) {
    const baseDC = $07f88a1a2cd9bae4$export$bcb07a78a2f89083(item.level, {
        proficiencyWithoutLevel: proficiencyWithoutLevel
    });
    const rarity = $07f88a1a2cd9bae4$export$eac0396674c51d5e(item);
    const dc = $07f88a1a2cd9bae4$export$285e1d124f214ce6(baseDC, rarity);
    if (item.isMagical) return $07f88a1a2cd9bae4$export$88dab0cc25983d19(item, dc, notMatchingTraditionModifier);
    if (!noDC) return {
        cra: dc
    };
    if (item.isAlchemical) return {
        cra: dc
    };
    return {
        dc: dc
    };
}
function $07f88a1a2cd9bae4$export$d2ea10be675672b(source) {
    return $07f88a1a2cd9bae4$export$9e72cd1a981905c2(source) && "invested" in source.system.equipped;
}
function $07f88a1a2cd9bae4$export$9e72cd1a981905c2(source) {
    return (0, $06ea898bdee42455$export$7fd671bc170c6856)($07f88a1a2cd9bae4$export$c6f5f26a78b4295b, source.type);
}
function $07f88a1a2cd9bae4$export$44db2df49f4dbb6d(actor, itemType, id) {
    return actor.itemTypes[itemType].find((x)=>x.getFlag("core", "sourceId") === id);
}
const $07f88a1a2cd9bae4$export$c4de6253c838d60a = "tLa4bewBhyqzi6Ow";
const $07f88a1a2cd9bae4$export$132139220723bb42 = {
    1: "RjuupS9xyXDLgyIr",
    2: "Y7UD64foDbDMV9sx",
    3: "ZmefGBXGJF3CFDbn",
    4: "QSQZJ5BC3DeHv153",
    5: "tjLvRWklAylFhBHQ",
    6: "4sGIy77COooxhQuC",
    7: "fomEZZ4MxVVK3uVu",
    8: "iPki3yuoucnj7bIt",
    9: "cFHomF3tty8Wi1e5",
    10: "o1XIHJ4MJyroAHfF"
};
const $07f88a1a2cd9bae4$var$wandCompendiumIds = {
    1: "UJWiN0K3jqVjxvKk",
    2: "vJZ49cgi8szuQXAD",
    3: "wrDmWkGxmwzYtfiA",
    4: "Sn7v9SsbEDMUIwrO",
    5: "5BF7zMnrPYzyigCs",
    6: "kiXh4SUWKr166ZeM",
    7: "nmXPj9zuMRQBNT60",
    8: "Qs8RgNH6thRPv2jt",
    9: "Fgv722039TVM5JTc"
};
function $07f88a1a2cd9bae4$export$759f065e99467277(level) {
    return `Compendium.pf2e.equipment-srd.${$07f88a1a2cd9bae4$export$132139220723bb42[level]}`;
}
function $07f88a1a2cd9bae4$export$b2d71906274eb828(type, heightenedLevel) {
    switch(type){
        case "cantripDeck5":
            return $07f88a1a2cd9bae4$export$c4de6253c838d60a;
        case "scroll":
            return $07f88a1a2cd9bae4$export$132139220723bb42[heightenedLevel] ?? null;
        default:
            return $07f88a1a2cd9bae4$var$wandCompendiumIds[heightenedLevel] ?? null;
    }
}


const $f6c0b3be47017fed$var$UUIDS = {
    scroll: [
        "Compendium.pf2e.feats-srd.OqObuRB8oVSAEKFR",
        "Compendium.pf2e.feats-srd.nWd7m0yRcIEVUy7O",
        "Compendium.pf2e.feats-srd.LHjPTV5vP3MOsPPJ"
    ],
    talisman: [
        "Compendium.pf2e.feats-srd.ygCLN0brunmBYtJR",
        "Compendium.pf2e.feats-srd.VO8HbMQ79NULE4FQ"
    ],
    trickster: [
        "Compendium.pf2e.feats-srd.ROAUR1GhC19Pjk9C",
        "Compendium.pf2e.feats-srd.UrOj9TROtn8nuxPf",
        "Compendium.pf2e.feats-srd.lIg5Gzz7W70jfbk1"
    ],
    dabbler: [
        "Compendium.pf2e.feats-srd.1t5479E6bdvFs4E7",
        "Compendium.pf2e.feats-srd.PTXZ2C3AV8tZf0iX"
    ]
};
function $f6c0b3be47017fed$var$flattenUUIDS() {
    const uuids = Object.entries($f6c0b3be47017fed$var$UUIDS).flatMap(([group, uuids])=>{
        return uuids.map((x, i)=>[
                x,
                {
                    uuid: x,
                    group: group,
                    index: i,
                    exists: false
                }
            ]);
    });
    return new Map(uuids);
}
function $f6c0b3be47017fed$var$expandUUIDS(flatUUIDS) {
    const uuids = {};
    for (const entry of flatUUIDS.values()){
        uuids[entry.group] ??= [];
        uuids[entry.group][entry.index] = entry.exists;
    }
    return uuids;
}
function $f6c0b3be47017fed$export$7d17d70f2e77f82d(actor) {
    const uuids = $f6c0b3be47017fed$var$flattenUUIDS();
    actor.itemTypes.feat.forEach((feat)=>{
        const sourceId = feat.getFlag("core", "sourceId");
        const entry = uuids.get(sourceId);
        if (entry) entry.exists = true;
    });
    return $f6c0b3be47017fed$var$expandUUIDS(uuids);
}
function $f6c0b3be47017fed$export$dad830a78ee132d7(actor, feats) {
    const uuids = feats.map((x)=>$f6c0b3be47017fed$var$UUIDS[x[0]][x[1]]);
    return !!actor.itemTypes.feat.find((x)=>uuids.includes(x.getFlag("core", "sourceId")));
}



function $bd602e7d70bc6167$export$54f992c69bf0c22c(result) {
    if (result.type === CONST.TABLE_RESULT_TYPES.DOCUMENT) return `${result.documentCollection}.${result.documentId}`;
    if (result.type === CONST.TABLE_RESULT_TYPES.COMPENDIUM) return `Compendium.${result.documentCollection}.${result.documentId}`;
    return undefined;
}
function $bd602e7d70bc6167$export$20ab79f56cb5e678(uuid, name) {
    if (name) return `@UUID[${uuid}]{${name}}`;
    return `@UUID[${uuid}]`;
}
function $bd602e7d70bc6167$export$673773a20336d834(name) {
    return `<span style="background: #DDD;
    padding: 1px 4px;
    border: 1px solid var(--color-border-dark-tertiary);
    border-radius: 2px;
    white-space: nowrap;
    word-break: break-all;">${name}</span>`;
}


function $feccc7a5980a21d5$export$3b90ba7d4b602662(item) {
    if (!item || !item.isOfType("consumable")) return false;
    if (!item.traits.has("talisman")) return false;
    return true;
}
function $feccc7a5980a21d5$export$ae435123c67c53c7(item) {
    if (!item || !item.isOfType("spell")) return false;
    if (item.isCantrip || item.isRitual) return false;
    return true;
}
function $feccc7a5980a21d5$export$62651879628e0c4c(key, data, fakeLink = false) {
    let msg = `<p>${(0, $87d8485a68ef7966$export$b3bd0bc58e36cd63)(`app.message.${key}`)}</p>`;
    data.forEach((x)=>{
        const name = x.name.endsWith(" **") ? x.name.slice(0, -3) : x.name;
        msg += fakeLink ? `<p>${(0, $bd602e7d70bc6167$export$673773a20336d834)(name)}</p>` : `<p>@UUID[${x.uuid}]{${name}}</p>`;
    });
    return msg;
}


const $ea02428521cc9836$var$localize = (0, $87d8485a68ef7966$export$a2435eff6fb7f6c1)("app");
class $ea02428521cc9836$export$3c9276ec80fdf8ae extends Application {
    constructor(actor){
        super({
            id: `pf2e-dailies-${actor.id}`
        });
        this._actor = actor;
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: $ea02428521cc9836$var$localize("title"),
            template: (0, $7a9da4a58a01538c$export$bdd507c72609c24e)("app.html"),
            height: "auto",
            dragDrop: [
                {
                    dropSelector: '[name="spell"], [name="talisman"]'
                }
            ]
        });
    }
    getData(options) {
        const actor = this._actor;
        const saved = (0, $f5e8fbc5299fcdea$export$a19b74191e00c5e)(actor, "saved") ?? {};
        const feats = (0, $f6c0b3be47017fed$export$7d17d70f2e77f82d)(actor);
        return {
            i18n: $ea02428521cc9836$var$localize,
            feats: feats,
            saved: saved,
            level: actor.level,
            getTalismanValue: (values, index, attr)=>values?.[index]?.[attr] ?? "",
            getSpellValue: (values, level, attr)=>values?.[level - 1]?.[attr] ?? "",
            addOne: (v)=>v + 1
        };
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find("[data-type=spell] [data-action=search]").on("click", this.#onSpellSearch.bind(this));
        html.find("[data-type=talisman] [data-action=search]").on("click", this.#onTalismanSearch.bind(this));
        html.find("[data-action=clear]").on("click", this.#onClear.bind(this));
        html.find("[data-action=accept]").on("click", this.#onAccept.bind(this));
        html.find("[data-action=cancel]").on("click", this.#onCancel.bind(this));
    }
    async _onDrop(event) {
        const dataString = event.dataTransfer?.getData("text/plain");
        try {
            const input = $(event.target);
            const type = input.attr("name");
            const typeLabel = game.i18n.localize(type === "spell" ? "PF2E.SpellLabel" : "PF2E.TraitTalisman").toLowerCase();
            const typeError = ()=>(0, $c5fee9ae913138c0$export$c106dd0671a0fc2d)("app.error.wrongType", {
                    type: typeLabel
                });
            const data = JSON.parse(dataString);
            if (!data || data.type !== "Item" || typeof data.uuid !== "string") return typeError();
            const typeValidation = type === "spell" ? (0, $feccc7a5980a21d5$export$ae435123c67c53c7) : (0, $feccc7a5980a21d5$export$3b90ba7d4b602662);
            const item = await fromUuid(data.uuid);
            if (!typeValidation(item)) return typeError();
            const actor = this._actor;
            const maxLevel = type === "spell" ? Number(input.attr("data-level")) : Math.floor(actor.level / 2);
            if (item.level > maxLevel) return (0, $c5fee9ae913138c0$export$c106dd0671a0fc2d)("app.error.wrongLevel", {
                type: typeLabel
            });
            input.attr("value", item.name);
            input.attr("data-uuid", item.uuid);
            input.nextAll('[data-action="clear"]').first().removeClass("disabled");
        } catch  {}
    }
    #onSpellSearch(event) {
        event.preventDefault();
        const level = Number(event.currentTarget.dataset.level);
        const levels = [];
        for(let i = 0; i < level; i++)levels[i] = i + 1;
        const filter = {
            category: [
                "spell"
            ],
            classes: [],
            level: levels,
            rarity: [],
            school: [],
            source: [],
            traditions: [],
            traits: []
        };
        game.pf2e.compendiumBrowser.openTab("spell", filter);
    }
    #onTalismanSearch(event1) {
        const actor = this._actor;
        const filter = {
            armorTypes: [],
            weaponTypes: [],
            itemtypes: [
                "consumable"
            ],
            rarity: [],
            source: [],
            traits: [
                "talisman"
            ],
            levelRange: {
                min: 1,
                max: Math.floor(actor.level / 2)
            }
        };
        game.pf2e.compendiumBrowser.openTab("equipment", filter);
    }
    #onClear(event2) {
        event2.preventDefault();
        const target = $(event2.currentTarget);
        const input = target.prevAll('[name="spell"], [name="talisman"]').first();
        input.attr("value", "");
        input.attr("data-uuid", "");
        target.addClass("disabled");
    }
    #lock() {
        this.element.find("button").attr("disabled", "true");
        this.element.find("a").addClass("disabled");
    }
    async #onAccept(event3) {
        event3.preventDefault();
        this.#lock();
        const actor = this._actor;
        const flags = (0, $f5e8fbc5299fcdea$export$a19b74191e00c5e)(actor, "saved") ?? {};
        const groups = {};
        const remove = [];
        const add = [];
        let message = "";
        this.element.find(".window-content .groups .group").each((_, el)=>{
            const group = $(el);
            const category = group.attr("data-category");
            group.find('[name="spell"], [name="talisman"]').each((i, el)=>{
                const input = $(el);
                const uuid = input.attr("data-uuid");
                const level = Number(input.attr("data-level") || 0);
                const flag = flags[category]?.[i];
                const hasItem = !!flag?.itemId && !!actor.items.has(flag.itemId);
                let value;
                if (flag?.uuid === uuid && hasItem) value = flag;
                else {
                    const name = input.attr("value");
                    const type = input.attr("name");
                    value = {
                        name: name,
                        uuid: uuid,
                        itemId: uuid ? randomID() : ""
                    };
                    if (hasItem) remove.push({
                        name: name,
                        uuid: flag.uuid,
                        itemId: flag.itemId
                    });
                    if (uuid) add.push({
                        name: name,
                        uuid: uuid,
                        itemId: value.itemId,
                        type: type,
                        level: level,
                        category: category
                    });
                }
                groups[category] ??= [];
                groups[category][i] = value;
            });
        });
        if (remove.length) {
            const ids = remove.map((x)=>x.itemId);
            const items = await actor.deleteEmbeddedDocuments("Item", ids);
            message += (0, $feccc7a5980a21d5$export$62651879628e0c4c)("remove", items, true);
        }
        if (add.length) {
            const data = [];
            const scrolls = [];
            for (const entry of add){
                const uuid = entry.uuid;
                const level = entry.level;
                const category = $ea02428521cc9836$var$localize(entry.category);
                let item;
                if (entry.type === "talisman") {
                    item = (await fromUuid(uuid))?.toObject();
                    if (!item) continue;
                    item.system.description.value = $ea02428521cc9836$var$localize("item.talisman.description", {
                        category: category,
                        description: item.system.description.value
                    });
                } else {
                    const scrollUUID = (0, $07f88a1a2cd9bae4$export$759f065e99467277)(level);
                    scrolls[level] ??= await fromUuid(scrollUUID);
                    const spell = await fromUuid(uuid);
                    item = scrolls[level]?.toObject();
                    if (!item || !spell) continue;
                    item.name = $ea02428521cc9836$var$localize("item.spell.name", {
                        name: spell.name,
                        level: level
                    });
                    item.system.spell = spell.clone({
                        "system.location.heightenedLevel": level
                    }).toObject();
                    item.system.traits.value.push(...spell.traditions);
                    item.system.description.value = $ea02428521cc9836$var$localize("item.spell.description", {
                        category: category,
                        uuid: uuid,
                        description: item.system.description.value
                    });
                }
                item.name = `${item.name} **`;
                setProperty(item, "_id", entry.itemId);
                setProperty(item, (0, $7a9da4a58a01538c$export$79b67f6e2f31449)("temporary"), true);
                data.push(item);
            }
            const items = await actor.createEmbeddedDocuments("Item", data, {
                keepId: true
            });
            message += (0, $feccc7a5980a21d5$export$62651879628e0c4c)("add", items);
        }
        (0, $f5e8fbc5299fcdea$export$5e165df1e30a1331)(actor, "saved", groups);
        if (message) message = `${$ea02428521cc9836$var$localize("message.changes")}<hr>${message}`;
        else message = $ea02428521cc9836$var$localize("message.noChanges");
        ChatMessage.create({
            content: message,
            speaker: ChatMessage.getSpeaker({
                actor: actor
            })
        });
        this.close();
    }
    #onCancel(event4) {
        event4.preventDefault();
        this.close();
    }
}



const $eaeac6e049dc3dfe$var$localize = (0, $87d8485a68ef7966$export$a2435eff6fb7f6c1)("sheet");
const $eaeac6e049dc3dfe$var$feats = [
    [
        "scroll",
        0
    ],
    [
        "talisman",
        0
    ],
    [
        "trickster",
        0
    ],
    [
        "dabbler",
        0
    ]
];
function $eaeac6e049dc3dfe$export$9408ec82f8a50d7c(sheet, html) {
    const actor = sheet.actor;
    if (!(0, $f6c0b3be47017fed$export$dad830a78ee132d7)(actor, $eaeac6e049dc3dfe$var$feats)) return;
    const title = $eaeac6e049dc3dfe$var$localize("title");
    const link = `<a class="roll-icon dailies" title="${title}"><i class="fas fa-mug-saucer"></i></a>`;
    html.find("aside .sidebar .hitpoints .hp-small").append(link).find(".dailies").on("click", ()=>new (0, $ea02428521cc9836$export$3c9276ec80fdf8ae)(actor).render(true));
}



function $affac971e7ed6841$export$e086df5a71e51694(hook, fn) {
    const id = Hooks.on(hook, fn);
    const index = Hooks.events[hook].findIndex((x)=>x.id === id);
    if (index !== 0) {
        const [hooked] = Hooks.events[hook].splice(index, 1);
        Hooks.events[hook].unshift(hooked);
    }
}



const $1e9af8c22026770e$var$localize = (0, $87d8485a68ef7966$export$a2435eff6fb7f6c1)("warning");
function $1e9af8c22026770e$export$737ef88b7e2208cf(enable) {
    if (enable) {
        (0, $affac971e7ed6841$export$e086df5a71e51694)("dropCanvasData", $1e9af8c22026770e$var$onDropCanvasData);
        (0, $affac971e7ed6841$export$e086df5a71e51694)("dropActorSheetData", $1e9af8c22026770e$var$onDropActorSheetData);
    } else {
        Hooks.off("dropCanvasData", $1e9af8c22026770e$var$onDropCanvasData);
        Hooks.off("dropActorSheetData", $1e9af8c22026770e$var$onDropActorSheetData);
    }
}
function $1e9af8c22026770e$var$onDropCanvasData(canvas, data) {
    $1e9af8c22026770e$var$checkForWarning(data);
}
function $1e9af8c22026770e$var$onDropActorSheetData(target, targetSheet, data) {
    if (data.actorId === target.id) return;
    $1e9af8c22026770e$var$checkForWarning(data);
}
function $1e9af8c22026770e$var$checkForWarning(data) {
    if (data.type !== "Item" || !data.uuid) return;
    const item = fromUuidSync(data.uuid);
    if (!item || !(0, $f5e8fbc5299fcdea$export$a19b74191e00c5e)(item, "temporary")) return;
    const content = `<p class="dailies-center">${$1e9af8c22026770e$var$localize("message")}</p>`;
    Dialog.prompt({
        title: $1e9af8c22026770e$var$localize("title"),
        label: $1e9af8c22026770e$var$localize("label"),
        content: content,
        rejectClose: false,
        options: {
            width: 320
        }
    });
}


Hooks.on("renderCharacterSheetPF2e", (0, $eaeac6e049dc3dfe$export$9408ec82f8a50d7c));
Hooks.once("init", ()=>{
    (0, $c143594d021ef19f$export$3bfe3819d89751f0)({
        name: "warning",
        type: Boolean,
        default: true,
        scope: "client",
        config: true,
        onChange: (0, $1e9af8c22026770e$export$737ef88b7e2208cf)
    });
});
Hooks.once("ready", ()=>{
    if ((0, $c143594d021ef19f$export$8206e8d612b3e63)("warning")) setTimeout(()=>(0, $1e9af8c22026770e$export$737ef88b7e2208cf)(true), 2000);
});


//# sourceMappingURL=main.js.map
