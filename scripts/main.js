(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };

  // src/module.js
  var MODULE_ID = "pf2e-dailies";
  var AsyncFunction = async function() {
  }.constructor;
  function getSetting(key) {
    return game.settings.get(MODULE_ID, key);
  }
  __name(getSetting, "getSetting");
  function setSetting(key, value) {
    return game.settings.set(MODULE_ID, key, value);
  }
  __name(setSetting, "setSetting");
  function getSettingLocalizationPath(...path) {
    return `${MODULE_ID}.settings.${path.join(".")}`;
  }
  __name(getSettingLocalizationPath, "getSettingLocalizationPath");
  function registerSetting(options) {
    const name = options.name;
    options.scope = options.scope ?? "world";
    options.config = options.config ?? false;
    if (options.config) {
      options.name = getSettingLocalizationPath(name, "name");
      options.hint = getSettingLocalizationPath(name, "hint");
    }
    if (Array.isArray(options.choices)) {
      options.choices = options.choices.reduce((choices, choice) => {
        choices[choice] = getSettingLocalizationPath(name, "choices", choice);
        return choices;
      }, {});
    }
    game.settings.register(MODULE_ID, name, options);
  }
  __name(registerSetting, "registerSetting");
  function registerSettingMenu(options) {
    const name = options.name;
    options.name = getSettingLocalizationPath("menus", name, "name");
    options.label = getSettingLocalizationPath("menus", name, "label");
    options.hint = getSettingLocalizationPath("menus", name, "hint");
    options.restricted = options.restricted ?? true;
    options.icon = options.icon ?? "fas fa-cogs";
    game.settings.registerMenu(MODULE_ID, name, options);
  }
  __name(registerSettingMenu, "registerSettingMenu");
  function templatePath(...path) {
    path = path.filter((x) => typeof x === "string");
    return `modules/${MODULE_ID}/templates/${path.join("/")}`;
  }
  __name(templatePath, "templatePath");
  function getFlag(doc, key, fallback) {
    return doc.getFlag(MODULE_ID, key) ?? fallback;
  }
  __name(getFlag, "getFlag");
  function setFlag(doc, key, value) {
    return doc.setFlag(MODULE_ID, key, value);
  }
  __name(setFlag, "setFlag");
  function localize(...args) {
    let [key, data] = args;
    key = `${MODULE_ID}.${key}`;
    if (data)
      return game.i18n.format(key, data);
    return game.i18n.localize(key);
  }
  __name(localize, "localize");
  function hasLocalization(key) {
    return game.i18n.has(`${MODULE_ID}.${key}`, false);
  }
  __name(hasLocalization, "hasLocalization");
  function localizePath(key) {
    return `${MODULE_ID}.${key}`;
  }
  __name(localizePath, "localizePath");
  function subLocalize(subKey) {
    const fn = /* @__PURE__ */ __name((...args) => localize(`${subKey}.${args[0]}`, args[1]), "fn");
    Object.defineProperties(fn, {
      warn: {
        value: (...args) => warn(`${subKey}.${args[0]}`, args[1], args[2]),
        enumerable: false,
        configurable: false
      },
      info: {
        value: (...args) => info(`${subKey}.${args[0]}`, args[1], args[2]),
        enumerable: false,
        configurable: false
      },
      error: {
        value: (...args) => error(`${subKey}.${args[0]}`, args[1], args[2]),
        enumerable: false,
        configurable: false
      },
      has: {
        value: (key) => hasLocalization(`${subKey}.${key}`),
        enumerable: false,
        configurable: false
      },
      path: {
        value: (key) => localizePath(`${subKey}.${key}`),
        enumerable: false,
        configurable: false
      },
      template: {
        value: (key, { hash }) => fn(key, hash),
        enumerable: false,
        configurable: false
      }
    });
    return fn;
  }
  __name(subLocalize, "subLocalize");
  function getChatMessageClass() {
    return CONFIG.ChatMessage.documentClass;
  }
  __name(getChatMessageClass, "getChatMessageClass");
  function notify(str, arg1, arg2, arg3) {
    const type = typeof arg1 === "string" ? arg1 : "info";
    const data = typeof arg1 === "object" ? arg1 : typeof arg2 === "object" ? arg2 : void 0;
    const permanent = typeof arg1 === "boolean" ? arg1 : typeof arg2 === "boolean" ? arg2 : arg3 ?? false;
    ui.notifications.notify(localize(str, data), type, { permanent });
  }
  __name(notify, "notify");
  function warn(...args) {
    const [str, arg1, arg2] = args;
    notify(str, "warning", arg1, arg2);
  }
  __name(warn, "warn");
  function info(...args) {
    const [str, arg1, arg2] = args;
    notify(str, "info", arg1, arg2);
  }
  __name(info, "info");
  function error(...args) {
    const [str, arg1, arg2] = args;
    notify(str, "error", arg1, arg2);
  }
  __name(error, "error");
  function getSourceId(doc) {
    return doc.getFlag("core", "sourceId");
  }
  __name(getSourceId, "getSourceId");
  function includesSourceId(doc, list) {
    const sourceId = getSourceId(doc);
    return sourceId ? list.includes(sourceId) : false;
  }
  __name(includesSourceId, "includesSourceId");
  function getItemSourceIdCondition(sourceId) {
    return Array.isArray(sourceId) ? (item) => includesSourceId(item, sourceId) : (item) => getSourceId(item) === sourceId;
  }
  __name(getItemSourceIdCondition, "getItemSourceIdCondition");
  function getItems(actor, itemTypes) {
    return itemTypes ? itemTypes.flatMap((type) => actor.itemTypes[type]) : actor.items;
  }
  __name(getItems, "getItems");
  function findItemWithSourceId(actor, sourceId, itemTypes) {
    return getItems(actor, itemTypes).find(getItemSourceIdCondition(sourceId));
  }
  __name(findItemWithSourceId, "findItemWithSourceId");
  function sequenceArray(start, end) {
    const levels = [];
    if (start <= end) {
      for (let i = start; i <= end; i++)
        levels.push(i);
    } else {
      for (let i = start; i >= end; i--)
        levels.push(i);
    }
    return levels;
  }
  __name(sequenceArray, "sequenceArray");
  function capitalize(str) {
    if (!str)
      return "";
    return str[0].toUpperCase() + str.slice(1);
  }
  __name(capitalize, "capitalize");
  function chatUUID(uuid, name) {
    if (name)
      return `@UUID[${uuid}]{${name}}`;
    return `@UUID[${uuid}]`;
  }
  __name(chatUUID, "chatUUID");
  function fakeChatUUID(name) {
    return `<span style="background: #DDD;
    padding: 1px 4px;
    border: 1px solid var(--color-border-dark-tertiary);
    border-radius: 2px;
    white-space: nowrap;
    word-break: break-all;">${name}</span>`;
  }
  __name(fakeChatUUID, "fakeChatUUID");

  // src/data/spell.js
  function createSpellDaily(key, uuid, filter = {}, level, label) {
    const daily = {
      key,
      label,
      item: {
        uuid
      },
      rows: [
        {
          type: "drop",
          slug: "spell",
          filter: {
            type: "spell",
            search: filter
          }
        }
      ],
      process: async ({ addSpell, utils: utils2, fields, messages }) => {
        const uuid2 = fields.spell.uuid;
        const source = await utils2.createSpellSource(uuid2);
        const label2 = `${source.name} (Level ${level || source.system.level.value})`;
        addSpell(source, level);
        messages.add("spells", { uuid: uuid2, label: label2 });
      }
    };
    return daily;
  }
  __name(createSpellDaily, "createSpellDaily");

  // src/data/ace.js
  function tricksterAce() {
    const daily = createSpellDaily(
      "ace",
      "Compendium.pf2e.feats-srd.Item.POrE3ZgBRdBL9MsW",
      {
        category: ["cantrip", "spell"],
        level: 4
      },
      4
    );
    const row = daily.rows[0];
    row.filter.drop = (item) => {
      const castTime = item.system.time.value;
      if (castTime.includes("hour") || castTime.includes("min") && parseInt(castTime) > 10) {
        return { error: localizePath("interface.error.drop.wrongSpellTime"), data: { time: "10 min" } };
      }
      return true;
    };
    return daily;
  }
  __name(tricksterAce, "tricksterAce");

  // src/data/blade.js
  var bladeAlly = {
    key: "blade",
    item: {
      uuid: "Compendium.pf2e.classfeatures.Item.EtltLdiy9kNfHU0c"
      // Blade Ally
    },
    children: [
      {
        slug: "good",
        uuid: "Compendium.pf2e.classfeatures.Item.nxZYP3KGfTSkaW6J"
        // The Tenets of Good
      },
      {
        slug: "evil",
        uuid: "Compendium.pf2e.classfeatures.Item.JiY2ZB4FkK8RJm4T"
        // The Tenets of Evil
      },
      {
        slug: "liberator",
        uuid: "Compendium.pf2e.classfeatures.Item.FCoMFUsth4xB4veC"
        // Liberator
      },
      {
        slug: "paladin",
        uuid: "Compendium.pf2e.classfeatures.Item.peEXunfbSD8WcMFk"
        // Paladin
      },
      {
        slug: "antipaladin",
        uuid: "Compendium.pf2e.classfeatures.Item.EQ6DVIQHAUXUhY6Y"
        // Antipaladin
      },
      {
        slug: "tyrant",
        uuid: "Compendium.pf2e.classfeatures.Item.HiIvez0TqESbleB5"
        // Tyrant
      },
      {
        slug: "spirit",
        uuid: "Compendium.pf2e.feats-srd.Item.h5ksUZlrVGBjq6p4"
        // Radiant Blade Spirit
      },
      {
        slug: "master",
        uuid: "Compendium.pf2e.feats-srd.Item.jYEMVfrXJLpXS6aC"
        // Radiant Blade Master
      }
    ],
    rows: [
      {
        type: "select",
        slug: "weapon",
        label: () => localize("label.blade.weapon"),
        options: ({ actor }) => {
          return actor.itemTypes.weapon.filter((weapon) => !weapon.isAlchemical).map((weapon) => ({ value: weapon.id, label: weapon.name }));
        }
      },
      {
        type: "select",
        slug: "rune",
        label: () => localize("label.blade.rune"),
        options: ({ children }) => {
          const runes = ["returning", "shifting"];
          const { antipaladin, evil, good, liberator, master, paladin, spirit, tyrant } = children;
          if (spirit) {
            runes.push("flaming");
            if (good)
              runes.push("holy");
            if (evil)
              runes.push("unholy");
            if (liberator || antipaladin)
              runes.push("anarchic");
            if (paladin || tyrant)
              runes.push("axiomatic");
          }
          if (good)
            runes.push("disrupting", "ghost-touch");
          if (master)
            runes.push("greater-disrupting", "keen");
          if (evil)
            runes.push("fearsome");
          return runes.map((value) => ({
            value,
            label: localizeRune(value)
          }));
        },
        condition: ({ actor }) => actor.itemTypes.weapon.filter((weapon) => !weapon.isAlchemical).length
      }
    ],
    process: async ({ actor, fields, addRule, messages }) => {
      const weaponId = fields.weapon.value;
      const rune = fields.rune.value;
      const weapon = actor.items.get(weaponId);
      if (!weapon)
        return;
      addRule(
        {
          definition: [`item:id:${weaponId}`],
          key: "AdjustStrike",
          mode: "add",
          property: "property-runes",
          value: rune
        },
        weapon
      );
      addRule(
        {
          key: "CriticalSpecialization",
          predicate: [
            {
              or: [`item:category:${weapon.category}`, `item:id:${weaponId}`]
            }
          ]
        },
        weapon
      );
      const name = weapon.name !== weapon._source.name ? `... ${weapon._source.name}` : weapon.name;
      messages.addGroup("blade");
      messages.add("blade", {
        uuid: weapon.uuid,
        label: name,
        selected: localizeRune(rune)
      });
    }
  };
  function localizeRune(value) {
    const slugged = value.replace(/-\w/, (match) => match[1].toUpperCase());
    return game.i18n.localize(`PF2E.WeaponPropertyRune.${slugged}.Name`);
  }
  __name(localizeRune, "localizeRune");

  // src/data/chain.js
  var rows = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
  function createScrollChain(key, uuids, label) {
    const daily = {
      key,
      label,
      item: {
        uuid: uuids[0]
      },
      children: [
        {
          slug: "expert",
          uuid: uuids[1]
        },
        {
          slug: "master",
          uuid: uuids[2]
        }
      ],
      rows: [
        createRow("first", 1),
        //
        createRow("second", 2, 8),
        createRow("third", 3, void 0, "expert"),
        //
        createRow("fourth", 4, 14, "expert"),
        createRow("fifth", 5, 16, "expert"),
        createRow("sixth", 6, void 0, "master"),
        //
        createRow("seventh", 7, 20, "master")
      ],
      process: async ({ utils: utils2, fields, addItem, messages }) => {
        for (const field of Object.values(fields)) {
          const uuid = field.uuid;
          const level = rows.indexOf(field.row) + 1;
          const source = await utils2.createSpellScrollSource({ uuid, level });
          addItem(source);
          messages.add("scrolls", { uuid, label: source.name });
        }
      }
    };
    return daily;
  }
  __name(createScrollChain, "createScrollChain");
  function createRow(slug, level, minActorLevel, child) {
    const row = {
      type: "drop",
      slug,
      label: `PF2E.SpellLevel${level}`,
      filter: {
        type: "spell",
        search: {
          category: ["spell"],
          level
        }
      }
    };
    if (minActorLevel)
      row.condition = ({ actor }) => actor.level >= minActorLevel;
    if (child)
      row.childPredicate = [child];
    return row;
  }
  __name(createRow, "createRow");

  // src/data/feat.js
  function createFeatDaily(key, uuid, filter = {}, label) {
    const daily = {
      key,
      label,
      item: {
        uuid
      },
      rows: [
        {
          type: "drop",
          slug: "feat",
          filter: {
            type: "feat",
            search: filter
          }
        }
      ],
      process: async ({ utils: utils2, fields, addFeat, messages }) => {
        const uuid2 = fields.feat.uuid;
        const source = await utils2.createFeatSource(uuid2);
        addFeat(source);
        messages.add("feats", { uuid: uuid2 });
      }
    };
    return daily;
  }
  __name(createFeatDaily, "createFeatDaily");

  // src/data/flexibility.js
  var combatFlexibility = {
    key: "flexibility",
    item: {
      uuid: "Compendium.pf2e.classfeatures.Item.8g6HzARbhfcgilP8"
      // Combat Flexibility
    },
    children: [
      {
        slug: "improved",
        uuid: "Compendium.pf2e.classfeatures.Item.W2rwudMNcAxs8VoX"
        // Improved Flexibility
      }
    ],
    rows: [
      createRow2("flexibility", 8),
      //
      createRow2("improved", 14, "improved")
    ],
    process: async ({ utils: utils2, fields, addFeat, messages, children }) => {
      const uuid = fields.flexibility.uuid;
      const source = await utils2.createFeatSource(uuid);
      addFeat(source);
      messages.add("feats", { uuid });
      if (children.improved) {
        const uuid2 = fields.improved.uuid;
        const source2 = await utils2.createFeatSource(uuid2);
        addFeat(source2, children.improved);
        messages.add("feats", { uuid: uuid2 });
      }
    }
  };
  function createRow2(slug, level, child) {
    const row = {
      type: "drop",
      label: `PF2E.Level${level}`,
      slug,
      filter: {
        type: "feat",
        search: {
          category: ["class"],
          traits: ["fighter"],
          level
        }
      }
    };
    if (child)
      row.childPredicate = [child];
    return row;
  }
  __name(createRow2, "createRow");

  // src/data/language.js
  function createLanguageDaily(key, uuid, label) {
    return {
      key,
      label,
      item: {
        uuid
      },
      rows: [
        {
          type: "select",
          slug: "language",
          options: ({ actor, utils: utils2 }) => {
            const actorLanguages = actor.system.traits.languages.value;
            return utils2.languageNames.filter((x) => !actorLanguages.includes(x)).sort();
          },
          labelizer: ({ utils: utils2 }) => utils2.languageLabel
        }
      ],
      process: ({ addRule, utils: utils2, fields, messages }) => {
        const value = fields.language.value;
        const source = utils2.createLanguageRuleElement({ language: value });
        addRule(source);
        messages.add("languages", { uuid, selected: utils2.languageLabel(value), label });
      }
    };
  }
  __name(createLanguageDaily, "createLanguageDaily");

  // src/data/mind.js
  var MIND_WEAPON_UUID = "Compendium.pf2e-dailies.equipment.Item.VpmEozw21aRxX15P";
  var WEAPON_BASE_TYPES = {
    0: { die: "d4", traits: ["finesse", "agile"], usage: "held-in-one-hand" },
    1: { die: "d6", traits: ["finesse"], usage: "held-in-one-hand" },
    2: { die: "d8", traits: [], usage: "held-in-one-hand" },
    3: { die: "d10", traits: ["reach"], usage: "held-in-two-hands" }
  };
  var WEAPON_GROUPS = {
    slashing: "sword",
    piercing: "spear",
    bludgeoning: "club"
  };
  var WEAPON_TRAITS = ["grapple", "nonlethal", "shove", "trip", "modular"];
  var WEAPON_DAMAGE_TYPES = Object.keys(WEAPON_GROUPS);
  var WEAPON_RUNES = ["corrosive", "disrupting", "flaming", "frost", "shock", "thundering"];
  var WEAPON_GREATER_RUNES = [
    "anarchic",
    "axiomatic",
    "greaterCorrosive",
    "greaterDisrupting",
    "greaterFlaming",
    "greaterFrost",
    "greaterShock",
    "greaterThundering",
    "holy",
    "unholy"
  ];
  var mindSmith = {
    key: "mindsmith",
    item: {
      uuid: "Compendium.pf2e.feats-srd.Item.juikoiIA0Jy8PboY"
      // Mind Smith Dedication
    },
    children: [
      {
        slug: "weapon",
        uuid: MIND_WEAPON_UUID
        // Mind Weapon
      },
      {
        slug: "mental",
        uuid: "Compendium.pf2e.feats-srd.Item.PccekOihIbRWdDky"
        // Malleable Mental Forge
      },
      {
        slug: "runic",
        uuid: "Compendium.pf2e.feats-srd.Item.2uQbQgz1AbjzcFSp"
        // Runic Mind Smithing
      },
      {
        slug: "advanced",
        uuid: "Compendium.pf2e.feats-srd.Item.fgnfXwFcn9jZlXGD"
        // Advanced Runic Mind Smithing
      }
    ],
    rows: [
      {
        type: "alert",
        slug: "alert",
        message: () => localize("interface.alert.weapon"),
        fix,
        childPredicate: [{ not: "weapon" }]
      },
      {
        type: "select",
        slug: "smith",
        label: () => localize("label.mindsmith"),
        options: WEAPON_DAMAGE_TYPES,
        labelizer: ({ utils: utils2 }) => utils2.damageLabel,
        childPredicate: ["weapon"]
      },
      {
        type: "select",
        slug: "mental",
        label: () => localize("label.mentalforge"),
        options: WEAPON_TRAITS,
        labelizer: ({ utils: utils2 }) => utils2.weaponTraitLabel,
        childPredicate: ["weapon", "mental"]
      },
      {
        type: "select",
        slug: "runic",
        label: () => localize("label.runicmind"),
        options: WEAPON_RUNES,
        labelizer: ({ utils: utils2 }) => utils2.weaponPropertyRunesLabel,
        childPredicate: ["weapon", "runic", { not: "advanced" }],
        condition: ({ children, utils: utils2 }) => utils2.hasFreePropertySlot(children.weapon)
      },
      {
        type: "select",
        slug: "advanced",
        label: () => localize("label.runicmind"),
        options: WEAPON_GREATER_RUNES,
        labelizer: ({ utils: utils2 }) => utils2.weaponPropertyRunesLabel,
        childPredicate: ["weapon", "advanced"],
        condition: ({ children, utils: utils2 }) => utils2.hasFreePropertySlot(children.weapon)
      }
    ],
    process: ({ children, updateItem, fields, messages, item, utils: utils2 }) => {
      const weapon = children.weapon;
      if (!weapon)
        return;
      messages.addGroup("mindsmith");
      const selected = fields.smith.value;
      updateItem({ _id: weapon.id, "system.damage.damageType": selected, "system.group": WEAPON_GROUPS[selected] });
      messages.add("mindsmith", { selected: utils2.damageLabel(selected), uuid: item.uuid, label: "mindsmith" });
      if (children.mental) {
        const selected2 = fields.mental.value;
        const traits = deepClone(weapon._source.system.traits?.value ?? []);
        if (!traits.includes(selected2))
          traits.push(selected2);
        updateItem({ _id: weapon.id, "system.traits.value": traits });
        messages.add("mindsmith", {
          selected: utils2.weaponTraitLabel(selected2),
          uuid: children.mental.uuid,
          label: "mentalforge"
        });
      }
      if ((children.advanced || children.runic) && utils2.hasFreePropertySlot(weapon)) {
        const child = children.advanced ?? children.runic;
        const freeSlot = utils2.getFreePropertyRuneSlot(weapon);
        const field = fields.advanced ?? fields.runic;
        const selected2 = field.value;
        if (freeSlot && !weapon.system.runes.property.includes(selected2)) {
          updateItem({ _id: weapon.id, [`system.${freeSlot}.value`]: selected2, [`flags.${MODULE_ID}.runeSlot`]: freeSlot });
          messages.add("mindsmith", {
            selected: utils2.weaponPropertyRunesLabel(selected2),
            uuid: child.uuid,
            label: "runicmind"
          });
        }
      }
    },
    rest: ({ item, sourceId, updateItem }) => {
      if (sourceId !== MIND_WEAPON_UUID)
        return;
      let traits = item._source.system.traits?.value ?? [];
      traits = traits.filter((trait) => !WEAPON_TRAITS.includes(trait));
      updateItem({ _id: item.id, "system.traits.value": traits });
      const runeSlot = getFlag(item, "runeSlot");
      if (runeSlot) {
        updateItem({ _id: item.id, [`system.${runeSlot}.value`]: null, [`flags.${MODULE_ID}.-=runeSlot`]: true });
      }
    }
  };
  async function fix({ actor }) {
    const localize5 = subLocalize("dialog.weapon");
    let content = localize5("flavor");
    for (const key of ["0", "1", "2", "3"]) {
      const label = localize5(`option.${key}`);
      content += `<label><input type="radio" name="type" value="${key}">${label}</label>`;
    }
    const weapon = await Dialog.wait(
      {
        title: localize5("title"),
        content,
        buttons: {
          yes: {
            icon: '<i class="fas fa-save"></i>',
            label: localize5("accept"),
            callback: onWeaponSelected
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: localize5("cancel"),
            callback: () => null
          }
        },
        close: () => null
      },
      {},
      { id: "pf2e-dailies-weapon", width: 600 }
    );
    if (weapon) {
      await actor.createEmbeddedDocuments("Item", [weapon]);
      return true;
    }
    return false;
  }
  __name(fix, "fix");
  async function onWeaponSelected(html) {
    const localize5 = subLocalize("dialog.weapon");
    const selection = html.find("[name=type]:checked").val();
    if (!selection) {
      localize5.warn("error.noSelection");
      return;
    }
    const weapon = (await fromUuid(MIND_WEAPON_UUID))?.toObject();
    if (!weapon) {
      localize5.warn("error.missing");
      return;
    }
    const stats = WEAPON_BASE_TYPES[selection];
    setProperty(weapon, "system.damage.die", stats.die);
    setProperty(weapon, "system.traits.value", stats.traits.slice());
    setProperty(weapon, "system.usage.value", stats.usage);
    return weapon;
  }
  __name(onWeaponSelected, "onWeaponSelected");

  // src/data/resistance.js
  function createResistancelDaily(key, uuid, resistances, resistance, label, random) {
    const daily = {
      key,
      label,
      item: {
        uuid
      },
      rows: [
        {
          type: random ? "random" : "select",
          slug: "resistance",
          options: resistances,
          labelizer: ({ utils: utils2 }) => utils2.resistanceLabel
        }
      ],
      process: async ({ utils: utils2, fields, actor, addRule, messages }) => {
        const type = random ? await utils2.randomOption(resistances) : fields.resistance.value;
        const value = typeof resistance === "number" ? resistance : resistance === "half" ? utils2.halfLevelValue(actor) : actor.level;
        const rule = utils2.createResistanceRuleElement({ type, value });
        addRule(rule);
        messages.add("resistances", { uuid, selected: utils2.resistanceLabel(type, value), label, random });
      }
    };
    return daily;
  }
  __name(createResistancelDaily, "createResistancelDaily");

  // src/data/root.js
  var effectUUID = "Compendium.pf2e.feat-effects.Item.jO7wMhnjT7yoAtQg";
  var rootMagic = {
    key: "root",
    item: {
      uuid: "Compendium.pf2e.feats-srd.Item.22P7IFyhrF7Fbw8B"
    },
    rows: [
      {
        type: "select",
        slug: "target",
        options: ({ actor, utils: utils2 }) => {
          const actors = utils2.getPlayersActors(actor);
          return actors.map((a) => ({ value: a.id, label: a.name }));
        }
      }
    ],
    process: ({ fields, messages }) => {
      const actorId = fields.target.value;
      const actor = game.actors.get(actorId);
      if (!actor)
        return;
      messages.addGroup("root");
      messages.add("root", { uuid: effectUUID, selected: actor.name });
    }
  };

  // src/data/savant.js
  var scrollSavant = {
    key: "savant",
    item: {
      uuid: "Compendium.pf2e.feats-srd.Item.u5DBg0LrBUKP0JsJ"
      // Scroll Savant
    },
    prepare: ({ actor }) => {
      const { maxSlot, maxTradition } = getSpellcastingTraditionDetails(actor, "arcane");
      const custom = {
        first: { level: maxSlot - 2, condition: true },
        second: { level: maxSlot - 3, condition: true },
        third: { level: maxSlot - 4, condition: maxTradition >= 3 && maxSlot >= 5 },
        fourth: { level: maxSlot - 5, condition: maxTradition >= 4 && maxSlot >= 6 }
      };
      return custom;
    },
    rows: ["first", "second", "third", "fourth"].map((rowName) => {
      const row = {
        type: "drop",
        slug: rowName,
        label: ({ custom }) => `PF2E.SpellLevel${custom[rowName].level}`,
        filter: {
          type: "spell",
          search: ({ custom }) => ({
            category: ["spell"],
            traditions: ["arcane"],
            level: custom[rowName].level
          })
        },
        condition: ({ custom }) => custom[rowName].condition
      };
      return row;
    }),
    process: async ({ utils: utils2, fields, custom, addItem, messages }) => {
      for (const field of Object.values(fields)) {
        const uuid = field.uuid;
        const source = await utils2.createSpellScrollSource({ uuid, level: custom[field.row].level });
        addItem(source);
        messages.add("scrolls", { uuid, label: source.name });
      }
    }
  };
  function getSpellcastingTraditionDetails(actor, tradition) {
    let maxSlot = 1;
    let maxTradition = 0;
    for (const entry of actor.spellcasting.regular) {
      if (entry.flags && "pf2e-staves" in entry.flags)
        continue;
      const slots = entry.system.slots;
      for (const key in slots) {
        const slot = slots[key];
        if (slot.max)
          maxSlot = Math.max(maxSlot, Number(key.slice(4)));
      }
      if (entry.tradition === tradition)
        maxTradition = Math.max(maxTradition, entry.rank);
    }
    return { maxSlot: Math.min(maxSlot, 10), maxTradition };
  }
  __name(getSpellcastingTraditionDetails, "getSpellcastingTraditionDetails");

  // src/data/skill.js
  function createTrainedSkillDaily(key, uuid, label) {
    const daily = {
      key,
      label,
      item: {
        uuid
      },
      rows: [
        {
          type: "combo",
          slug: "skill",
          options: ({ actor, utils: utils2 }) => {
            const actorSkills = actor.skills;
            return utils2.skillNames.filter((x) => actorSkills[x].rank < 1);
          },
          labelizer: ({ utils: utils2 }) => utils2.skillLabel
        }
      ],
      process: ({ fields, addItem, addRule, utils: utils2, messages }) => {
        let value = fields.skill.value;
        if (fields.skill.input === "true") {
          const source = utils2.createLoreSource({ name: value, rank: 1 });
          addItem(source);
        } else {
          const source = utils2.createSkillRuleElement({ skill: value, value: 1 });
          value = utils2.skillLabel(value);
          addRule(source);
        }
        messages.add("skills", { uuid, selected: value, label });
      }
    };
    return daily;
  }
  __name(createTrainedSkillDaily, "createTrainedSkillDaily");
  function createTrainedLoreDaily(key, uuid, label) {
    const daily = {
      key,
      label,
      item: {
        uuid
      },
      rows: [
        {
          type: "input",
          slug: "skill"
        }
      ],
      process: ({ addItem, utils: utils2, fields, messages }) => {
        const value = fields.skill.value;
        const source = utils2.createLoreSource({ name: value, rank: 1 });
        addItem(source);
        messages.add("skills", { uuid, selected: value, label });
      }
    };
    return daily;
  }
  __name(createTrainedLoreDaily, "createTrainedLoreDaily");

  // src/data/tome.js
  var thaumaturgeTome = {
    key: "tome",
    item: {
      uuid: "Compendium.pf2e.classfeatures.Item.MyN1cQgE0HsLF20e"
      // Tome
    },
    children: [
      {
        slug: "adept",
        uuid: "Compendium.pf2e.classfeatures.Item.Obm4ItMIIr0whYeO",
        // Implement Adept
        condition: createChildCondition("adept")
      },
      {
        slug: "second",
        uuid: "Compendium.pf2e.classfeatures.Item.ZEUxZ4Ta1kDPHiq5",
        // Second Adept
        condition: createChildCondition("adept")
      },
      {
        slug: "intense",
        uuid: "Compendium.pf2e.feats-srd.Item.yRRM1dsY6jakEMaC"
        // Intense Implement
      },
      {
        slug: "paragon",
        uuid: "Compendium.pf2e.classfeatures.Item.QEtgbY8N2V4wTbsI",
        // Implement Paragon
        condition: createChildCondition("paragon")
      }
    ],
    prepare: ({ utils: utils2, actor, children }) => {
      const skillNames = utils2.skillNames;
      const actorLevel = actor.level;
      const actorSkills = actor.skills;
      const custom = {
        first: { options: [], rank: 1 },
        second: { options: [], rank: 1 }
      };
      if (children.paragon) {
        const skills = skillNames.filter((x) => actorSkills[x].rank < 4);
        custom.first = { rank: 4, options: skills };
        custom.second = { rank: 4, options: skills };
      } else if (children.intense || children.adept || children.second) {
        const masters = skillNames.filter((x) => actorSkills[x].rank < 3);
        if (actorLevel >= 9) {
          custom.first = { rank: 3, options: masters };
          custom.second = { rank: 3, options: masters };
        } else {
          const experts = skillNames.filter((x) => actorSkills[x].rank < 2);
          custom.first = { rank: 2, options: experts };
          custom.second = { rank: 3, options: masters };
        }
      } else {
        if (actorLevel >= 5) {
          const experts = skillNames.filter((x) => actorSkills[x].rank < 2);
          custom.first = { rank: 2, options: experts };
          custom.second = { rank: 2, options: experts };
        } else if (actorLevel >= 3) {
          const trained = skillNames.filter((x) => actorSkills[x].rank < 1);
          const experts = skillNames.filter((x) => actorSkills[x].rank < 2);
          custom.first = { rank: 1, options: trained };
          custom.second = { rank: 2, options: experts };
        } else {
          const trained = skillNames.filter((x) => actorSkills[x].rank < 1);
          custom.first = { rank: 1, options: trained };
          custom.second = { rank: 1, options: trained };
        }
      }
      return custom;
    },
    rows: ["first", "second"].map((rowName) => {
      const row = {
        type: "combo",
        slug: rowName,
        label: ({ custom, utils: utils2 }) => utils2.proficiencyLabel(custom[rowName].rank),
        options: ({ custom }) => custom[rowName].options,
        labelizer: ({ utils: utils2 }) => utils2.skillLabel
      };
      return row;
    }),
    process: ({ custom, fields, utils: utils2, messages, addItem, addRule }) => {
      messages.addGroup("tome", 65);
      for (const rowName of ["first", "second"]) {
        const rank = custom[rowName].rank;
        let value = fields[rowName].value;
        if (fields[rowName].input === "true") {
          const source = utils2.createLoreSource({ name: value, rank });
          addItem(source);
        } else {
          const source = utils2.createSkillRuleElement({ skill: value, value: rank });
          value = utils2.skillLabel(value);
          addRule(source);
        }
        messages.add("tome", { label: utils2.proficiencyLabel(rank), selected: value });
      }
    }
  };
  function createChildCondition(option) {
    return function({ item, utils: utils2 }) {
      return utils2.getChoiSetRuleSelection(item, option) === "tome";
    };
  }
  __name(createChildCondition, "createChildCondition");

  // src/dailies.js
  var DEPRECATED_CUSTOM_DAILIES = ["root-magic"];
  var BUILTINS_DAILIES = [
    thaumaturgeTome,
    createTrainedSkillDaily("longevity", "Compendium.pf2e.feats-srd.Item.WoLh16gyDp8y9WOZ"),
    // Ancestral Longevity
    createTrainedSkillDaily("ageless", "Compendium.pf2e.feats-srd.Item.wylnETwIz32Au46y"),
    // Ageless Spirit
    createTrainedSkillDaily("memories", "Compendium.pf2e.feats-srd.Item.ptEOt3lqjxUnAW62"),
    // Ancient Memories
    createTrainedSkillDaily("studies", "Compendium.pf2e.feats-srd.Item.9bgl6qYWKHzqWZj0"),
    // Flexible Studies
    createTrainedLoreDaily("study", "Compendium.pf2e.feats-srd.Item.aLJsBBZzlUK3G8MW"),
    // Quick Study
    createLanguageDaily("linguistics", "Compendium.pf2e.feats-srd.Item.eCWQU16hRLfN1KaX"),
    // Ancestral Linguistics
    createLanguageDaily("borts", "Compendium.pf2e.equipment-srd.Item.iS7hAQMAaThHYE8g"),
    // Bort's Blessing
    createResistancelDaily(
      "elementalist",
      "Compendium.pf2e.feats-srd.Item.tx9pkrpmtqe4FnvS",
      ["air", "earth", "fire", "water"],
      "half",
      "elementalist"
    ),
    // Elementalist Dedication
    createResistancelDaily(
      "ganzi",
      "Compendium.pf2e.heritages.Item.3reGfXH0S82hM7Gp",
      ["acid", "electricity", "sonic"],
      "half",
      "ganzi",
      true
    ),
    // Ganzi
    createFeatDaily("metamagical", "Compendium.pf2e.classfeatures.Item.89zWKD2CN7nRu2xp", {
      category: ["class"],
      traits: { selected: ["metamagic", "wizard"], conjunction: "and" },
      level: "half"
    }),
    // Metamagical Experimentation
    combatFlexibility,
    scrollSavant,
    createScrollChain("esoterica", [
      "Compendium.pf2e.feats-srd.Item.OqObuRB8oVSAEKFR",
      // Scroll Esoterica
      "Compendium.pf2e.feats-srd.Item.nWd7m0yRcIEVUy7O",
      // Elaborate Scroll Esoterica
      "Compendium.pf2e.feats-srd.Item.LHjPTV5vP3MOsPPJ"
      // Grand Scroll Esoterica
    ]),
    createScrollChain("trickster", [
      "Compendium.pf2e.feats-srd.Item.ROAUR1GhC19Pjk9C",
      // Basic Scroll Cache
      "Compendium.pf2e.feats-srd.Item.UrOj9TROtn8nuxPf",
      // Expert Scroll Cache
      "Compendium.pf2e.feats-srd.Item.lIg5Gzz7W70jfbk1"
      // Master Scroll Cache
    ]),
    tricksterAce(),
    mindSmith,
    bladeAlly,
    rootMagic
  ];
  var BUILTINS_UUIDS = prepareDailies(BUILTINS_DAILIES, "dailies");
  var UUIDS = /* @__PURE__ */ new Map();
  function prepareDailies(dailies, prefix) {
    const uuids = /* @__PURE__ */ new Map();
    for (const original of dailies) {
      const daily = deepClone(original);
      try {
        const keyWithPrefix = `${prefix}.${daily.key}`;
        uuids.set(daily.item.uuid, { daily, condition: daily.item.condition });
        daily.key = keyWithPrefix;
        if (daily.children) {
          for (let i = 0; i < daily.children.length; i++) {
            const { uuid, condition } = daily.children[i];
            uuids.set(uuid, { daily, index: i, condition });
          }
        }
      } catch (err) {
        error("error.unexpected");
        console.error(err);
        console.error(`The error occured during data gathering of ${prefix}.${daily.key}`);
      }
    }
    return uuids;
  }
  __name(prepareDailies, "prepareDailies");
  var CUSTOM_DAILIES = [];
  async function parseCustomDailies() {
    UUIDS.clear();
    CUSTOM_DAILIES = [];
    const customs = getSetting("customDailies");
    for (const { key, code } of customs) {
      try {
        const fn = new AsyncFunction(code);
        const daily = await fn();
        if (!checkCustomDaily(daily, true))
          continue;
        CUSTOM_DAILIES.push(daily);
      } catch (err) {
        error("error.unexpected");
        console.error(err);
        console.error(`The error occured during call of custom function for ${key}`);
      }
    }
    for (const [uuid, daily] of BUILTINS_UUIDS.entries()) {
      UUIDS.set(uuid, daily);
    }
    const CUSTOM_UUIDS = prepareDailies(CUSTOM_DAILIES, "custom");
    for (const [uuid, daily] of CUSTOM_UUIDS.entries()) {
      UUIDS.set(uuid, daily);
    }
  }
  __name(parseCustomDailies, "parseCustomDailies");
  function checkCustomDaily(daily, warning = false) {
    if (!DEPRECATED_CUSTOM_DAILIES.includes(daily.key))
      return true;
    if (warning && game.user.isGM)
      warn("deprecated.custom.key", { name: daily.label.trim() || daily.key }, true);
    return false;
  }
  __name(checkCustomDaily, "checkCustomDaily");
  function getDailies(actor) {
    const dailies = {};
    for (const item of actor.items) {
      const sourceId = getSourceId(item);
      if (!sourceId || item.isOfType("physical") && item.isInvested === false)
        continue;
      const entry = UUIDS.get(sourceId);
      if (!entry)
        continue;
      const { daily, index, condition } = entry;
      try {
        if (typeof condition === "function" && !condition({ actor, item, utils }))
          continue;
        dailies[daily.key] ??= deepClone(daily);
        if (index === void 0)
          dailies[daily.key].item = item;
        else
          dailies[daily.key].children[index].item = item;
      } catch (err) {
        error("error.unexpected");
        console.error(err);
        console.error(`The error occured during data gathering of ${daily.key}`);
      }
    }
    return Object.values(dailies).filter((daily) => daily.item && daily.item instanceof Item);
  }
  __name(getDailies, "getDailies");
  function getDailyFromSourceId(sourceId) {
    return UUIDS.get(sourceId)?.daily;
  }
  __name(getDailyFromSourceId, "getDailyFromSourceId");

  // src/data/familiar.js
  function getFamiliarPack() {
    return game.packs.get("pf2e.familiar-abilities");
  }
  __name(getFamiliarPack, "getFamiliarPack");
  function familiarUUID(id) {
    return `Compendium.pf2e.familiar-abilities.Item.${id}`;
  }
  __name(familiarUUID, "familiarUUID");

  // src/data/rations.js
  var RATION_UUID = "Compendium.pf2e.equipment-srd.Item.L9ZV076913otGtiB";
  function getRations(actor) {
    return findItemWithSourceId(actor, RATION_UUID);
  }
  __name(getRations, "getRations");

  // src/pf2e/utils.js
  function ErrorPF2e(message) {
    return Error(`PF2e System | ${message}`);
  }
  __name(ErrorPF2e, "ErrorPF2e");
  function isObject(value) {
    return typeof value === "object" && value !== null;
  }
  __name(isObject, "isObject");

  // src/pf2e/predicate.js
  var PredicatePF2e = class extends Array {
    constructor(...statements) {
      super(...Array.isArray(statements[0]) ? statements[0] : statements);
      this.isValid = PredicatePF2e.isValid(this);
    }
    /** Structurally validate the predicates */
    static isValid(statements) {
      return this.isArray(statements);
    }
    /** Is this an array of predicatation statements? */
    static isArray(statements) {
      return super.isArray(statements) && statements.every((s) => StatementValidator.isStatement(s));
    }
    /** Test if the given predicate passes for the given list of options. */
    static test(predicate = [], options) {
      return predicate instanceof PredicatePF2e ? predicate.test(options) : new PredicatePF2e(...predicate).test(options);
    }
    /** Test this predicate against a domain of discourse */
    test(options) {
      if (this.length === 0) {
        return true;
      } else if (!this.isValid) {
        console.warn("PF2e System | The provided predicate set is malformed.");
        return false;
      }
      const domain = options instanceof Set ? options : new Set(options);
      return this.every((s) => this.#isTrue(s, domain));
    }
    toObject() {
      return deepClone([...this]);
    }
    clone() {
      return new PredicatePF2e(this.toObject());
    }
    /** Is the provided statement true? */
    #isTrue(statement, domain) {
      return typeof statement === "string" && domain.has(statement) || StatementValidator.isBinaryOp(statement) && this.#testBinaryOp(statement, domain) || StatementValidator.isCompound(statement) && this.#testCompound(statement, domain);
    }
    #testBinaryOp(statement, domain) {
      if ("eq" in statement) {
        return domain.has(`${statement.eq[0]}:${statement.eq[1]}`);
      } else {
        const operator = Object.keys(statement)[0];
        const [left, right] = Object.values(statement)[0];
        const domainArray = Array.from(domain);
        const getValues = /* @__PURE__ */ __name((operand) => {
          const maybeNumber = Number(operand);
          if (!Number.isNaN(maybeNumber))
            return [maybeNumber];
          const pattern = new RegExp(String.raw`^${operand}:([^:]+)$`);
          const values = domainArray.map((s) => Number(pattern.exec(s)?.[1] || NaN)).filter((v) => !Number.isNaN(v));
          return values.length > 0 ? values : [NaN];
        }, "getValues");
        const leftValues = getValues(left);
        const rightValues = getValues(right);
        switch (operator) {
          case "gt":
            return leftValues.some((l) => rightValues.every((r) => l > r));
          case "gte":
            return leftValues.some((l) => rightValues.every((r) => l >= r));
          case "lt":
            return leftValues.some((l) => rightValues.every((r) => l < r));
          case "lte":
            return leftValues.some((l) => rightValues.every((r) => l <= r));
          default:
            console.warn("PF2e System | Malformed binary operation encountered");
            return false;
        }
      }
    }
    /** Is the provided compound statement true? */
    #testCompound(statement, domain) {
      return "and" in statement && statement.and.every((subProp) => this.#isTrue(subProp, domain)) || "nand" in statement && !statement.nand.every((subProp) => this.#isTrue(subProp, domain)) || "or" in statement && statement.or.some((subProp) => this.#isTrue(subProp, domain)) || "xor" in statement && statement.xor.filter((subProp) => this.#isTrue(subProp, domain)).length === 1 || "nor" in statement && !statement.nor.some((subProp) => this.#isTrue(subProp, domain)) || "not" in statement && !this.#isTrue(statement.not, domain) || "if" in statement && !(this.#isTrue(statement.if, domain) && !this.#isTrue(statement.then, domain));
    }
  };
  __name(PredicatePF2e, "PredicatePF2e");
  var _binaryOperators;
  var StatementValidator = class {
    static isStatement(statement) {
      return statement instanceof Object ? this.isCompound(statement) || this.isBinaryOp(statement) : typeof statement === "string" ? this.isAtomic(statement) : false;
    }
    static isAtomic(statement) {
      return typeof statement === "string" && statement.length > 0 || this.isBinaryOp(statement);
    }
    static isBinaryOp(statement) {
      if (!isObject(statement))
        return false;
      const entries = Object.entries(statement);
      if (entries.length > 1)
        return false;
      const [operator, operands] = entries[0];
      return __privateGet(this, _binaryOperators).has(operator) && Array.isArray(operands) && operands.length === 2 && typeof operands[0] === "string" && ["string", "number"].includes(typeof operands[1]);
    }
    static isCompound(statement) {
      return isObject(statement) && (this.isAnd(statement) || this.isOr(statement) || this.isNand(statement) || this.isXor(statement) || this.isNor(statement) || this.isNot(statement) || this.isIf(statement));
    }
    static isAnd(statement) {
      return Object.keys(statement).length === 1 && Array.isArray(statement.and) && statement.and.every((subProp) => this.isStatement(subProp));
    }
    static isNand(statement) {
      return Object.keys(statement).length === 1 && Array.isArray(statement.nand) && statement.nand.every((subProp) => this.isStatement(subProp));
    }
    static isOr(statement) {
      return Object.keys(statement).length === 1 && Array.isArray(statement.or) && statement.or.every((subProp) => this.isStatement(subProp));
    }
    static isXor(statement) {
      return Object.keys(statement).length === 1 && Array.isArray(statement.xor) && statement.xor.every((subProp) => this.isStatement(subProp));
    }
    static isNor(statement) {
      return Object.keys(statement).length === 1 && Array.isArray(statement.nor) && statement.nor.every((subProp) => this.isStatement(subProp));
    }
    static isNot(statement) {
      return Object.keys(statement).length === 1 && !!statement.not && this.isStatement(statement.not);
    }
    static isIf(statement) {
      return Object.keys(statement).length === 2 && this.isStatement(statement.if) && this.isStatement(statement.then);
    }
  };
  __name(StatementValidator, "StatementValidator");
  _binaryOperators = new WeakMap();
  __privateAdd(StatementValidator, _binaryOperators, /* @__PURE__ */ new Set(["eq", "gt", "gte", "lt", "lte"]));

  // src/apps/interface/data.js
  var templateOrders = {
    select: 100,
    combo: 80,
    random: 60,
    alert: 40,
    input: 20,
    drop: 0
  };
  async function getTemplate({ children = [], key, item, prepare, label, rows: rows2 = [] }) {
    const actor = this.actor;
    const saved = this.saved[key] = getFlag(actor, key) ?? {};
    const rowsObj = this.rows[key] = {};
    const childrenObj = this.children[key] = children.reduce((children2, { slug, item: item2 }) => {
      children2[slug] = item2;
      return children2;
    }, {});
    const prepareArgs = {
      actor,
      item,
      children: childrenObj,
      utils
    };
    const custom = this.custom[key] = prepare && await prepare(prepareArgs) || {};
    const dailyArgs = this.dailyArgs[key] = {
      ...prepareArgs,
      custom
    };
    let groupLabel = await getProcessedValue(label, dailyArgs);
    const labeled = groupLabel ? `label.${groupLabel}` : key.startsWith("dailies.") ? `label.${key.slice(8)}` : void 0;
    if (labeled && hasLocalization(labeled))
      groupLabel = localize(labeled);
    const predicates = this.predicate[key] = children.filter((child) => child.item).map((child) => child.slug);
    const template = {
      label: groupLabel ? game.i18n.localize(groupLabel) : item.name,
      rows: []
    };
    for (const row of rows2) {
      rowsObj[row.slug] = row;
      const { type, slug, childPredicate = [], condition, label: label2, save } = row;
      if (childPredicate.length && !PredicatePF2e.test(childPredicate, predicates))
        continue;
      if (condition && !await condition(dailyArgs))
        continue;
      const savedRow = save === false || type === "random" ? void 0 : saved[slug];
      const rowLabel = await getProcessedValue(label2, dailyArgs);
      const value = savedRow === void 0 ? "" : typeof savedRow !== "object" ? savedRow : "name" in savedRow ? savedRow.name : savedRow.selected;
      const rowTemplate = {
        label: rowLabel ? game.i18n.localize(rowLabel) : "",
        value,
        order: templateOrders[type],
        data: {
          type,
          daily: key,
          row: slug
        }
      };
      if (isComboRow(row) || isSelectRow(row) || isRandomRow(row)) {
        const tmp = await getProcessedValue(row.options, dailyArgs) ?? [];
        if (type !== "combo" && !tmp.length)
          continue;
        const labelize = typeof row.labelizer === "function" && row.labelizer(dailyArgs) || ((value2) => capitalize(value2));
        rowTemplate.options = tmp.map((value2) => typeof value2 === "string" ? { value: value2, label: labelize(value2) } : value2);
        if (isComboRow(row)) {
          rowTemplate.selected = rowTemplate.value;
          rowTemplate.data.input = savedRow?.input ?? true;
          if (!rowTemplate.data.input && tmp.includes(rowTemplate.selected)) {
            rowTemplate.value = labelize(rowTemplate.selected);
          }
        }
      } else if (isDropRow(row)) {
        rowTemplate.data.uuid = savedRow?.uuid ?? "";
      } else if (isAlerRow(row)) {
        rowTemplate.value = typeof row.message === "function" ? await row.message(dailyArgs) : row.message;
      }
      template.rows.push(rowTemplate);
    }
    return template;
  }
  __name(getTemplate, "getTemplate");
  async function getProcessedValue(obj, args) {
    if (typeof obj === "function")
      return await obj(args);
    return obj;
  }
  __name(getProcessedValue, "getProcessedValue");
  function isComboRow(row) {
    return row.type === "combo";
  }
  __name(isComboRow, "isComboRow");
  function isSelectRow(row) {
    return row.type === "select";
  }
  __name(isSelectRow, "isSelectRow");
  function isRandomRow(row) {
    return row.type === "random";
  }
  __name(isRandomRow, "isRandomRow");
  function isDropRow(row) {
    return row.type === "drop";
  }
  __name(isDropRow, "isDropRow");
  function isAlerRow(row) {
    return row.type === "alert";
  }
  __name(isAlerRow, "isAlerRow");

  // src/pf2e/skills.js
  function getTranslatedSkills() {
    return Object.entries(CONFIG.PF2E.skillList).reduce((result, [key, value]) => {
      return {
        ...result,
        [key]: game.i18n.localize(value).toLocaleLowerCase(game.i18n.lang)
      };
    }, {});
  }
  __name(getTranslatedSkills, "getTranslatedSkills");

  // src/pf2e/sluggify.js
  var wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
  var nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
  var nonWordCharacterRE = new RegExp(nonWordCharacter, "gu");
  var wordBoundary = String.raw`(?:${wordCharacter})(?=${nonWordCharacter})|(?:${nonWordCharacter})(?=${wordCharacter})`;
  var nonWordBoundary = String.raw`(?:${wordCharacter})(?=${wordCharacter})`;
  var lowerCaseLetter = String.raw`\p{Lowercase_Letter}`;
  var upperCaseLetter = String.raw`\p{Uppercase_Letter}`;
  var lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, "gu");
  var nonWordCharacterHyphenOrSpaceRE = /[^-\p{White_Space}\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu;
  var upperOrWordBoundariedLowerRE = new RegExp(`${upperCaseLetter}|(?:${wordBoundary})${lowerCaseLetter}`, "gu");
  function sluggify(text, { camel = null } = {}) {
    if (typeof text !== "string") {
      console.warn("Non-string argument passed to `sluggify`");
      return "";
    }
    switch (camel) {
      case null:
        return text.replace(lowerCaseThenUpperCaseRE, "$1-$2").toLowerCase().replace(/['’]/g, "").replace(nonWordCharacterRE, " ").trim().replace(/[-\s]+/g, "-");
      case "bactrian": {
        const dromedary = sluggify(text, { camel: "dromedary" });
        return dromedary.charAt(0).toUpperCase() + dromedary.slice(1);
      }
      case "dromedary":
        return text.replace(nonWordCharacterHyphenOrSpaceRE, "").replace(/[-_]+/g, " ").replace(upperOrWordBoundariedLowerRE, (part, index) => index === 0 ? part.toLowerCase() : part.toUpperCase()).replace(/\s+/g, "");
      default:
        throw ErrorPF2e("I don't think that's a real camel.");
    }
  }
  __name(sluggify, "sluggify");

  // src/apps/interface/shared.js
  function getSimplifiableValue(actor, value, fallback) {
    if (value === void 0)
      return fallback;
    if (typeof value === "number")
      return value;
    if (value === "level")
      return actor.level;
    if (value === "half")
      return Math.max(1, Math.floor(actor.level / 2));
    const numbered = Number(value);
    return isNaN(numbered) ? fallback : numbered;
  }
  __name(getSimplifiableValue, "getSimplifiableValue");
  async function parseFilter(filter) {
    return {
      type: filter.type,
      search: await (filter.type === "feat" ? parseFeatFilter(this.actor, filter.search) : parseSpellFilter(this.actor, filter.search)),
      drop: filter.drop
    };
  }
  __name(parseFilter, "parseFilter");
  function checkFilter(selected, checkbox) {
    if (!selected?.length)
      return;
    checkbox.selected = selected;
    checkbox.isExpanded = true;
    selected.forEach((x) => checkbox.options[x].selected = true);
  }
  __name(checkFilter, "checkFilter");
  function setTraits(searchTraits, dataTraits) {
    const traits = getFilterTraits(searchTraits);
    if (traits?.selected.length) {
      dataTraits.conjunction = traits.conjunction;
      dataTraits.selected = traits.selected;
    }
  }
  __name(setTraits, "setTraits");
  function getFilterTraits(traits) {
    if (!traits)
      return;
    const selected = Array.isArray(traits) ? traits : traits.selected;
    if (!selected?.length)
      return;
    return {
      selected: selected.map((x) => typeof x === "string" ? { value: x } : x),
      conjunction: !Array.isArray(traits) && traits.conjunction || "and"
    };
  }
  __name(getFilterTraits, "getFilterTraits");
  async function parseSpellFilter(actor, search) {
    const data = await game.pf2e.compendiumBrowser.tabs.spell.getFilterData();
    checkFilter(search.category, data.checkboxes.category);
    checkFilter(search.school, data.checkboxes.school);
    checkFilter(search.traditions, data.checkboxes.traditions);
    checkFilter(search.rarity, data.checkboxes.rarity);
    checkFilter(search.source, data.checkboxes.source);
    setTraits(search.traits, data.multiselects.traits);
    const level = getSpellFilterLevel(actor, search.level);
    if (level?.length)
      checkFilter(level, data.checkboxes.level);
    return data;
  }
  __name(parseSpellFilter, "parseSpellFilter");
  async function parseFeatFilter(actor, search) {
    const data = await game.pf2e.compendiumBrowser.tabs.feat.getFilterData();
    checkFilter(search.category, data.checkboxes.category);
    checkFilter(search.skills, data.checkboxes.skills);
    checkFilter(search.rarity, data.checkboxes.rarity);
    checkFilter(search.source, data.checkboxes.source);
    setTraits(search.traits, data.multiselects.traits);
    const level = getFeatFilterLevel(actor, search.level);
    if (level) {
      data.sliders.level.values.min = level.min;
      data.sliders.level.values.max = level.max;
      data.sliders.level.isExpanded = true;
    }
    return data;
  }
  __name(parseFeatFilter, "parseFeatFilter");
  function getSpellFilterLevel(actor, level) {
    if (Array.isArray(level))
      return level;
    const simplified = getSimplifiableValue(actor, level);
    if (simplified)
      return sequenceArray(1, simplified);
  }
  __name(getSpellFilterLevel, "getSpellFilterLevel");
  function getFeatFilterLevel(actor, level) {
    if (level === void 0)
      return;
    if (typeof level === "object") {
      return {
        min: getSimplifiableValue(actor, level.min, 0),
        max: getSimplifiableValue(actor, level.min, 20)
      };
    } else {
      return { min: 0, max: getSimplifiableValue(actor, level, 20) };
    }
  }
  __name(getFeatFilterLevel, "getFeatFilterLevel");

  // src/apps/interface/drop.js
  var localize2 = subLocalize("interface.error.drop");
  async function onDropFeat(item, target, filter) {
    if (!item.isOfType("feat"))
      return localize2("notFeat");
    const { search, drop } = filter;
    if (search.category?.length && !search.category.includes(item.category)) {
      return localize2.warn("wrongType", { types: localizeAll("featCategories", search.category) });
    }
    if (search.traits) {
      const traits = getFilterTraits(search.traits);
      if (traits?.selected.length) {
        const testFn = traits.conjunction === "or" ? "some" : "every";
        const test = traits.selected[testFn]((trait) => Number(trait.not ?? false) - Number(item.traits.has(trait.value)));
        if (!test)
          return localize2.warn("wrongTraits");
      }
    }
    if (search.skills?.length) {
      const translatedSkills = getTranslatedSkills();
      const prerequisites = item.system.prerequisites.value.map((prerequisite) => prerequisite.value.toLocaleLowerCase());
      const test = search.skills.some(
        (skill) => prerequisites.some((prerequisite) => prerequisite.includes(skill) || prerequisite.includes(translatedSkills[skill]))
      );
      if (!test)
        return localize2.warn("wrongSkill", { skills: localizeAll("skillList", search.skills) });
    }
    if (search.rarity?.length && !search.rarity.includes(item.system.traits.rarity)) {
      return localize2.warn("wrongRarity", { rarities: localizeAll("rarityTraits", search.rarity) });
    }
    if (search.source?.length && !search.source.includes(sluggify(item.system.source.value))) {
      return localize2.warn("wrongSource", { sources: search.source.join(", ") });
    }
    const level = getFeatFilterLevel(this.actor, search.level);
    if (level) {
      const itemLevel = item.level;
      if (itemLevel < level.min)
        return localize2.warn("wrongLevelLow", { level: `min: ${level.min}` });
      else if (itemLevel > level.max)
        return localize2.warn("wrongLevelHigh", { level: `max: ${level.max}` });
    }
    if (drop) {
      const args = this.dailyArgs[target.dataset.daily];
      if (args) {
        const result = await drop(item, args);
        if (typeof result === "object") {
          if (result.data)
            return game.i18n.format(result.error, result.data);
          else
            return game.i18n.localize(result.error);
        } else if (result === false) {
          return localize2.warn("wrongCustom");
        }
      }
    }
    onDropItem(item, target);
  }
  __name(onDropFeat, "onDropFeat");
  async function onDropSpell(item, target, filter) {
    if (!item.isOfType("spell"))
      return localize2("notSpell");
    const { search, drop } = filter;
    if (search.category?.length) {
      const categories = search.category.map((x) => game.i18n.localize(x === "cantrip" ? "PF2E.SpellCantripLabel" : CONFIG.PF2E.spellCategories[x])).join(", ");
      if (item.isCantrip && !search.category.includes("cantrip") || item.isFocusSpell && !search.category.includes("focus") || item.isRitual && !search.category.includes("ritual") || !item.isCantrip && !item.isFocusSpell && !item.isRitual && !search.category.includes("spell")) {
        return localize2.warn("wrongCategory", { categories });
      }
    }
    if (search.traits) {
      const traits = getFilterTraits(search.traits);
      if (traits?.selected.length) {
        const testFn = traits.conjunction === "or" ? "some" : "every";
        const test = traits.selected[testFn]((trait) => Number(trait.not ?? false) - Number(item.traits.has(trait.value)));
        if (!test)
          return localize2.warn("wrongTraits");
      }
    }
    if (search.traditions?.length) {
      if (!search.traditions.some((tradition) => item.traditions.has(tradition))) {
        return localize2.warn("wrongTradition", { traditions: localizeAll("magicTraditions", search.traditions) });
      }
    }
    const level = getSpellFilterLevel(this.actor, search.level);
    if (level?.length && !level.includes(item.level)) {
      return localize2.warn("wrongLevel", { levels: level.join(", ") });
    }
    if (search.school?.length && !search.school.includes(item.school)) {
      return localize2.warn("wrongSchool", { schools: localizeAll("magicSchools", search.school) });
    }
    if (search.rarity?.length && !search.rarity.includes(item.system.traits.rarity)) {
      return localize2.warn("wrongRarity", { rarities: localizeAll("rarityTraits", search.rarity) });
    }
    if (search.source?.length && !search.source.includes(sluggify(item.system.source.value))) {
      return localize2.warn("wrongSource", { sources: search.source.join(", ") });
    }
    if (drop) {
      const args = this.dailyArgs[target.dataset.daily];
      if (args) {
        const result = await drop(item, args);
        if (typeof result === "object") {
          if (result.data)
            return ui.notifications.warn(game.i18n.format(result.error, result.data));
          else
            return ui.notifications.warn(game.i18n.localize(result.error));
        } else if (result === false) {
          return localize2.warn("wrongCustom");
        }
      }
    }
    onDropItem(item, target);
  }
  __name(onDropSpell, "onDropSpell");
  function localizeAll(config, list) {
    const localized = list.map((key) => game.i18n.localize(CONFIG.PF2E[config][key]));
    return localized.join(", ");
  }
  __name(localizeAll, "localizeAll");
  function onDropItem(item, target) {
    target.value = item.name;
    target.dataset.uuid = item.uuid;
    target.nextElementSibling.nextElementSibling.classList.remove("disabled");
  }
  __name(onDropItem, "onDropItem");

  // src/apps/interface/process.js
  async function processData() {
    const actor = this.actor;
    const dailies = this.dailies;
    const fields = getFields.call(this);
    const addItems = [];
    const addRules = /* @__PURE__ */ new Map();
    const updateItems = [];
    const flags = {};
    const msg = subLocalize("message");
    let addedSpells = false;
    let message = "";
    const getRules = /* @__PURE__ */ __name((item) => {
      const id = item.id;
      const existing = addRules.get(id);
      if (existing)
        return existing;
      const rules = deepClone(item._source.system.rules);
      for (let i = rules.length - 1; i >= 0; i--) {
        if (MODULE_ID in rules[i])
          rules.splice(i, 1);
      }
      addRules.set(id, rules);
      return rules;
    }, "getRules");
    const messages = {
      languages: { order: 80, messages: [] },
      skills: { order: 70, messages: [] },
      resistances: { order: 60, messages: [] },
      feats: { order: 50, messages: [] },
      spells: { order: 40, messages: [] },
      scrolls: { order: 30, messages: [] }
    };
    const messageObj = {
      add: (group, options) => {
        messages[group] ??= { order: 0, messages: [] };
        messages[group].messages.push(options);
      },
      addGroup: (group, order = 1, label) => {
        messages[group] ??= { label, order, messages: [] };
      }
    };
    if (actor.familiar && fields["dailies.familiar"]) {
      const familiar = actor.familiar;
      const pack = getFamiliarPack();
      const abilities = [];
      const ids = familiar.itemTypes.action.map((item) => item.id);
      if (ids.length)
        familiar.deleteEmbeddedDocuments("Item", ids);
      messageObj.addGroup("familiar", 20);
      for (const field of Object.values(fields["dailies.familiar"])) {
        const value = field.value;
        const isCustom = value.includes(".");
        const item = await (isCustom ? fromUuid(value) : pack.getDocument(value));
        if (!item || !item.isOfType("action"))
          continue;
        const source = item.toObject();
        if (source) {
          abilities.push(source);
          messageObj.add("familiar", { uuid: isCustom ? value : familiarUUID(value) });
        }
      }
      if (abilities.length)
        familiar.createEmbeddedDocuments("Item", abilities);
    }
    if (fields["dailies.rations"]?.rations.value === "true") {
      const rations = getRations(actor);
      if (rations?.uses.value) {
        const quantity = rations.quantity;
        const { value, max } = rations.uses;
        if (value <= 1) {
          if (quantity <= 1) {
            rations.delete();
          } else {
            updateItems.push({
              _id: rations.id,
              "system.quantity": Math.max(rations.quantity - 1, 0),
              "system.charges.value": max
            });
          }
        } else {
          updateItems.push({
            _id: rations.id,
            "system.charges.value": Math.max(value - 1, 0)
          });
        }
        const remaining = (quantity - 1) * max + value;
        const name = remaining <= 1 ? fakeChatUUID(rations.name) : chatUUID(rations.uuid);
        if (remaining <= 1)
          message += msg("rations.last", { name });
        else if (remaining <= 3)
          message += msg("rations.almost", { name, nb: remaining - 1 });
        else
          message += msg("rations.used", { name, nb: remaining - 1 });
      }
    }
    for (const { item, key, process } of dailies) {
      if (!fields[key])
        continue;
      const dailyArgs = this.dailyArgs[key];
      try {
        await process({
          ...dailyArgs,
          fields: fields[key],
          messages: messageObj,
          addItem: (source) => addItems.push(source),
          updateItem: (data) => updateItems.push(data),
          addRule: (source, parent) => {
            source[MODULE_ID] = true;
            getRules(parent ?? item).push(source);
          },
          addFeat: (source, parent) => {
            parent ??= item;
            if (parent.isOfType("feat")) {
              const parentId = parent.id;
              setProperty(source, "flags.pf2e.grantedBy", { id: parentId, onDelete: "cascade" });
              setProperty(source, `flags.${MODULE_ID}.grantedBy`, parentId);
            }
            addItems.push(source);
          },
          addSpell: (source, level) => {
            setProperty(source, `flags.${MODULE_ID}.entry`, { level });
            addItems.push(source);
            addedSpells = true;
          }
        });
      } catch (err) {
        error("error.unexpected");
        console.error(err);
        console.error(`The error occured during processing of ${key}`);
      }
    }
    for (const [key, rowFields] of Object.entries(fields)) {
      const rows2 = this.rows[key];
      if (!rows2)
        continue;
      for (const { row, type, input, value, uuid } of Object.values(rowFields)) {
        if (type === "random" || rows2[row]?.save === false)
          continue;
        const flag = flags[key] ??= {};
        if (type === "combo") {
          flag[row] = { input: input === "true", selected: value };
        } else if (type === "drop") {
          flag[row] = { uuid, name: value };
        } else {
          flag[row] = value;
        }
      }
    }
    for (const [id, rules] of addRules) {
      updateItems.push({ _id: id, "system.rules": rules });
    }
    if (addedSpells) {
      const entry = {
        type: "spellcastingEntry",
        name: localize("spellEntry.name"),
        system: {
          prepared: { value: "innate" },
          showSlotlessLevels: { value: false },
          showUnpreparedSpells: { value: false },
          proficiency: { value: 1, slug: actor.classDC?.slug || actor.class?.slug || void 0 }
        }
      };
      addItems.push(entry);
    }
    for (const source of addItems) {
      const alreadyTemp = getProperty(source, "system.temporary") === true;
      if (!alreadyTemp)
        setProperty(source, `flags.${MODULE_ID}.temporary`, true);
    }
    if (addItems.length) {
      const items = await actor.createEmbeddedDocuments("Item", addItems);
      for (const item of items) {
        if (item.isOfType("feat")) {
          const parentId = getFlag(item, "grantedBy");
          if (parentId) {
            const slug = sluggify(item.name, { camel: "dromedary" });
            const path = `flags.pf2e.itemGrants.${slug}`;
            updateItems.push({ _id: parentId, [path]: { id: item.id, onDelete: "detach" } });
          }
        } else if (item.isOfType("spellcastingEntry")) {
          const spells = items.filter((item2) => item2.isOfType("spell") && getFlag(item2, "entry"));
          for (const spell of spells) {
            const { level } = getFlag(spell, "entry");
            const data = { _id: spell.id, "system.location.value": item.id };
            if (level !== void 0)
              data["system.location.heightenedLevel"] = level;
            updateItems.push(data);
          }
        }
      }
    }
    await actor.update({ [`flags.${MODULE_ID}`]: { ...expandObject(flags), rested: false } });
    if (updateItems.length)
      await actor.updateEmbeddedDocuments("Item", updateItems);
    message = parseMessages(messages, message);
    message = message ? `${msg("changes")}<hr />${message}` : msg("noChanges");
    ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) });
  }
  __name(processData, "processData");
  function parseMessages(messages, message) {
    const msg = subLocalize("message");
    const messageList = Object.entries(messages).map(([type, options]) => {
      options.label ??= msg.has(type) ? msg(type) : msg("gained", { type });
      return options;
    });
    messageList.sort((a, b) => b.order - a.order);
    for (const { label, messages: messages2 } of messageList) {
      if (!messages2.length)
        continue;
      if (message)
        message += "<hr />";
      if (label)
        message += `<p><strong>${label}</strong></p>`;
      for (let { uuid, selected, label: label2, random } of messages2) {
        const key = `label.${label2}`;
        label2 = label2 && hasLocalization(key) ? localize(key) : label2 || "";
        message += "<p>";
        message += uuid ? `${chatUUID(uuid, label2)}` : `<strong>${label2}</strong>`;
        if (selected)
          message += ` <span>${selected}</span>`;
        if (random)
          message += ' <i class="fa-solid fa-dice-d20"></i>';
        message += "</p>";
      }
    }
    return message;
  }
  __name(parseMessages, "parseMessages");
  function getFields() {
    const elements = this.element.find(".window-content .content").find("input:not(.alert), select[data-type]").toArray();
    const fields = {};
    for (const element of elements) {
      const field = {
        ...element.dataset,
        value: element.value
      };
      if (field.type === "combo" && field.input === "false") {
        const select = element.previousElementSibling;
        field.value = select.value;
      }
      fields[field.daily] ??= {};
      fields[field.daily][field.row] = field;
    }
    return fields;
  }
  __name(getFields, "getFields");

  // src/apps/interface.js
  var localize3 = subLocalize("interface");
  var DailiesInterface = class extends Application {
    constructor(actor, options) {
      super(options);
      this._actor = actor;
      this._dailies = [];
      this._dailyArgs = {};
      this._saved = {};
      this._children = {};
      this._custom = {};
      this._predicate = {};
      this._rows = {};
    }
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        id: "pf2e-dailies-interface",
        template: templatePath("interface.hbs"),
        height: "auto",
        width: 400,
        submitOnClose: false,
        submitOnChange: false,
        dragDrop: [
          {
            dropSelector: '[data-droppable="true"]'
          }
        ]
      });
    }
    get actor() {
      return this._actor;
    }
    get dailies() {
      return this._dailies;
    }
    get dailyArgs() {
      return this._dailyArgs;
    }
    get saved() {
      return this._saved;
    }
    get children() {
      return this._children;
    }
    get custom() {
      return this._custom;
    }
    get predicate() {
      return this._predicate;
    }
    get rows() {
      return this._rows;
    }
    async getData(options) {
      const templates = [];
      const actor = this._actor;
      this._dailies = getDailies(actor);
      if (actor.familiar) {
        const type = "dailies.familiar";
        const localize5 = subLocalize("label");
        const nbAbilityies = actor.attributes.familiarAbilities.value;
        const pack = getFamiliarPack();
        const flags = getFlag(actor, type) ?? {};
        const template = {
          label: localize5("familiar"),
          rows: []
        };
        const options2 = pack.index.map(({ _id, name }) => ({ value: _id, label: name }));
        const customUUIDS = getSetting("familiar").split(",");
        for (let uuid of customUUIDS) {
          uuid = uuid.trim();
          const item = await fromUuid(uuid);
          if (item && item.isOfType("action"))
            options2.push({ value: uuid, label: item.name });
        }
        options2.sort((a, b) => a.label.localeCompare(b.label));
        for (let index = 0; index < nbAbilityies; index++) {
          template.rows.push({
            label: localize5("ability", { nb: index + 1 }),
            value: flags[`${index}`] ?? "",
            order: 100,
            options: options2,
            data: {
              type: "select",
              daily: type,
              row: index.toString()
            }
          });
        }
        if (template.rows.length) {
          this._rows[type] = template.rows.reduce((rows3, { data }) => {
            rows3[data.row] = { save: true };
            return rows3;
          }, {});
          templates.push(template);
        }
      }
      const rations = getRations(actor);
      if (rations?.uses.value) {
        const type = "dailies.rations";
        const row = "rations";
        const { value, max } = rations.uses;
        const quantity = rations.quantity;
        const remaining = (quantity - 1) * max + value;
        const last = remaining <= 1;
        const options2 = [
          {
            value: "false",
            label: localize3("rations.no")
          },
          {
            value: "true",
            label: last ? localize3("rations.last") : localize3("rations.yes", { nb: remaining })
          }
        ];
        templates.push({
          label: rations.name,
          rows: [
            {
              label: "",
              order: 200,
              value: "false",
              options: options2,
              data: {
                type: "select",
                daily: type,
                row
              }
            }
          ]
        });
        this._rows[type] = { [row]: { save: false } };
      }
      for (const daily of this._dailies) {
        try {
          const template = await getTemplate.call(this, daily);
          templates.push(template);
        } catch (error2) {
          localize3.error("error.unexpected");
          console.error(error2);
          console.error(`The error occured during templating of ${daily.key}`);
        }
      }
      const rows2 = [];
      const groups = [];
      for (const template of templates) {
        if (template.rows.length > 1)
          groups.push(template);
        else if (template.rows.length)
          rows2.push(template);
      }
      rows2.sort((a, b) => b.rows[0].order - a.rows[0].order);
      groups.sort((a, b) => a.rows.length - b.rows.length);
      return mergeObject(super.getData(options), {
        i18n: localize3,
        dump: ({ value, placeholder, data }) => {
          let msg = "";
          if (value)
            msg += ` value="${value}"`;
          if (placeholder)
            msg += ` placeholder="${placeholder}"`;
          Object.entries(data).forEach(([key, value2]) => msg += ` data-${key}="${value2}"`);
          if (msg)
            msg += " ";
          return msg;
        },
        rows: rows2,
        groups,
        hasDailies: rows2.length || groups.length
      });
    }
    render(force, options) {
      if (this._randomInterval)
        clearInterval(this._randomInterval);
      if (this.element.find("select.random")) {
        this._randomInterval = setInterval(() => {
          const randoms = this.element.find("select.random");
          randoms.each((_, select) => {
            select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
          });
        }, 2e3);
      }
      return super.render(force, options);
    }
    close(options) {
      if (this._randomInterval)
        clearInterval(this._randomInterval);
      return super.close(options);
    }
    activateListeners(html) {
      super.activateListeners(html);
      html.find("[data-action=clear]").on("click", this.#onClear.bind(this));
      html.find("[data-action=accept]").on("click", this.#onAccept.bind(this));
      html.find("[data-action=cancel]").on("click", this.#onCancel.bind(this));
      html.find(".combo select").on("change", this.#onComboSelectChange.bind(this));
      html.find(".combo input").on("change", this.#onComboInputChange.bind(this));
      html.find("[data-action=search]").on("click", this.#onSearch.bind(this));
      html.find("[data-action=alert]").on("click", this.#onAlert.bind(this));
    }
    _canDragDrop(selector) {
      return true;
    }
    async _onDrop(event) {
      const localize5 = subLocalize("interface.error.drop");
      let target = event.target;
      if (target instanceof HTMLLabelElement)
        target = target.nextElementSibling;
      try {
        const dataString = event.dataTransfer?.getData("text/plain");
        const data = JSON.parse(dataString);
        if (!data || data.type !== "Item" || typeof data.uuid !== "string")
          return localize5.warn("wrongDataType");
        const item = await fromUuid(data.uuid);
        if (!item)
          return localize5.warn("wrongDataType");
        const filter = await this.#getfilterFromElement(target);
        if (!filter)
          return onDropItem(item, target);
        if (filter.type === "feat")
          onDropFeat.call(this, item, target, filter);
        else if (filter.type === "spell")
          onDropSpell.call(this, item, target, filter);
        else
          onDropItem(item, target);
      } catch (error2) {
        localize5.error("error.unexpected");
        console.error(error2);
        console.error(`The error occured during _onDrop`);
      }
    }
    async #onAlert(event) {
      event.preventDefault();
      this.#lock();
      const data = event.currentTarget.dataset;
      const row = this.rows[data.daily][data.row];
      const args = this.dailyArgs[data.daily];
      let fixed;
      try {
        fixed = await row.fix(args);
      } catch (error2) {
        localize3.error("error.unexpected");
        console.error(error2);
        console.error(`The error occured during an alert fix of '${data.daily}'`);
      }
      this.#unlock();
      if (fixed)
        this.render();
    }
    async #onSearch(event) {
      event.preventDefault();
      const filter = await this.#getfilterFromElement(event.currentTarget, true);
      if (filter)
        game.pf2e.compendiumBrowser.openTab(filter.type, filter.search);
      else
        game.pf2e.compendiumBrowser.render(true);
    }
    async #getfilterFromElement(element, parsed) {
      const { daily, row } = element.dataset;
      const filter = this.rows[daily]?.[row]?.filter;
      const args = this.dailyArgs[daily];
      if (!args || !filter)
        return;
      if (typeof filter.search === "function")
        filter.search = await filter.search(args);
      if (!parsed)
        return filter;
      return parseFilter.call(this, filter);
    }
    #onComboSelectChange(event) {
      const select = event.currentTarget;
      const input = select.nextElementSibling;
      input.dataset.input = "false";
      input.value = select.options[select.selectedIndex].text;
    }
    #onComboInputChange(event) {
      const input = event.currentTarget;
      const select = input.previousElementSibling;
      const value = input.value.toLowerCase();
      const options = Array.from(select.options).map((x) => x.value);
      const index = options.indexOf(value);
      if (index !== -1) {
        select.value = value;
        input.value = select.options[index].text;
        input.dataset.input = "false";
      } else {
        select.value = "";
        input.dataset.input = "true";
      }
    }
    #lock() {
      this.element.addClass("disabled");
    }
    #unlock() {
      this.element.removeClass("disabled");
    }
    #validate() {
      const warns = [];
      const emptyInputs = this.element.find("input").filter((_, input) => !input.value);
      const alertInputs = this.element.find("input.alert");
      if (emptyInputs.length)
        warns.push("error.empty");
      if (alertInputs.length)
        warns.push("error.unattended");
      warns.forEach((x) => localize3.warn(x));
      return !warns.length;
    }
    async #onAccept(event) {
      event.preventDefault();
      if (!this.#validate())
        return;
      this.#lock();
      await processData.call(this);
      this.close();
    }
    #onClear(event) {
      event.preventDefault();
      const target = $(event.currentTarget);
      const input = target.prevAll("input").first();
      input.val("");
      input.attr("value", "");
      input.attr("data-uuid", "");
      target.addClass("disabled");
    }
    #onCancel(event) {
      event.preventDefault();
      this.close();
    }
  };
  __name(DailiesInterface, "DailiesInterface");

  // src/chat.js
  function renderChatMessage(message, html) {
    const flag = getFlag(message, "isWatch");
    if (!flag)
      return;
    html.find(".message-content button").on("click", () => openDailiesInterface());
  }
  __name(renderChatMessage, "renderChatMessage");
  function createWatchChatMessage() {
    let content = `<div>${localize("message.dailiesRequest.content")}</div>`;
    content += `<button type="button" style="margin-top: 8px;">${localize("message.dailiesRequest.button")}</button>`;
    getChatMessageClass().create({ content, flags: { [MODULE_ID]: { isWatch: true } } });
  }
  __name(createWatchChatMessage, "createWatchChatMessage");

  // src/pf2e/spell.js
  var scrollCompendiumIds = {
    1: "RjuupS9xyXDLgyIr",
    // Compendium.pf2e.equipment-srd.Item.RjuupS9xyXDLgyIr
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
  var scrolls = [];
  async function createSpellScroll(uuid, level, temp = false) {
    const spell = (await fromUuid(uuid))?.toObject();
    if (!spell)
      return null;
    if (level === false)
      level = spell.system.level.value;
    const scrollUUID = getScrollCompendiumUUID(level);
    scrolls[level] ??= await fromUuid(scrollUUID);
    const scroll = scrolls[level]?.toObject();
    if (!scroll)
      return null;
    spell.system.location.heightenedLevel = level;
    scroll.name = `Scroll of ${spell.name} (Level ${level})`;
    scroll.system.temporary = temp;
    scroll.system.spell = spell;
    scroll.system.traits.value.push(...spell.system.traditions.value);
    const sourceId = spell.flags.core?.sourceId;
    if (sourceId)
      scroll.system.description.value = `${chatUUID(sourceId)}
<hr />${scroll.system.description.value}`;
    return scroll;
  }
  __name(createSpellScroll, "createSpellScroll");
  function getScrollCompendiumUUID(level) {
    return `Compendium.pf2e.equipment-srd.Item.${scrollCompendiumIds[level]}`;
  }
  __name(getScrollCompendiumUUID, "getScrollCompendiumUUID");

  // src/api.js
  var halfLevelString = "max(1,floor(@actor.level/2))";
  var utils = {
    // Skills
    get skillNames() {
      return Object.keys(CONFIG.PF2E.skillList).slice();
    },
    skillLabel: (skill) => {
      return game.i18n.localize(CONFIG.PF2E.skillList[skill]);
    },
    createSkillRuleElement: ({ skill, value, mode = "upgrade", predicate }) => {
      const rule = {
        key: "ActiveEffectLike",
        mode,
        path: `system.skills.${skill}.rank`,
        value
      };
      if (predicate && predicate.length)
        rule.predicate = predicate;
      return rule;
    },
    createLoreSource: ({ name, rank }) => {
      const data = {
        type: "lore",
        img: "systems/pf2e/icons/default-icons/lore.svg",
        name,
        system: { proficient: { value: rank } }
      };
      return data;
    },
    // Languages
    get languageNames() {
      return Object.keys(CONFIG.PF2E.languages).slice();
    },
    languageLabel: (language) => {
      return game.i18n.localize(CONFIG.PF2E.languages[language]);
    },
    createLanguageRuleElement: ({ language, mode = "add", predicate }) => {
      const rule = {
        key: "ActiveEffectLike",
        mode,
        path: "system.traits.languages.value",
        value: language
      };
      if (predicate && predicate.length)
        rule.predicate = predicate;
      return rule;
    },
    // resistances
    resistanceLabel: (resistance, value) => {
      let str = game.i18n.localize(`PF2E.Trait${capitalize(resistance)}`);
      if (value)
        str += ` ${value}`;
      return str;
    },
    createResistanceRuleElement: ({ type, value, predicate }) => {
      if (value === "half")
        value = halfLevelString;
      const rule = {
        key: "Resistance",
        type,
        value
      };
      if (predicate && predicate.length)
        rule.predicate = predicate;
      return rule;
    },
    // feats
    createFeatSource: async (uuid) => {
      const source = (await fromUuid(uuid))?.toObject();
      if (!source)
        throw new Error(`An error occured while trying to create a feat source with uuid: ${uuid}`);
      return source;
    },
    // spells
    createSpellScrollSource: async ({ uuid, level }) => {
      const source = await createSpellScroll(uuid, level ?? false, true);
      if (!source)
        throw new Error(`An error occured while trying to create a spell scroll source with uuid: ${uuid}`);
      return source;
    },
    createSpellSource: async (uuid) => {
      const source = (await fromUuid(uuid))?.toObject();
      if (!source)
        throw new Error(`An error occured while trying to create a spell source with uuid: ${uuid}`);
      return source;
    },
    // Rule Elements
    get halfLevelString() {
      return halfLevelString;
    },
    getChoiSetRuleSelection: (item, option) => {
      const rules = item._source.system.rules;
      const rule = rules.find((rule2) => rule2.key === "ChoiceSet" && rule2.rollOption === option);
      return rule?.selection;
    },
    //
    proficiencyLabel: (rank) => {
      return game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank]);
    },
    randomOption: async (options) => {
      const roll = (await new Roll(`1d${options.length}`).evaluate({ async: true })).total;
      const result = options[roll - 1];
      if (typeof result === "string")
        return result;
      return result.value;
    },
    halfLevelValue: (actor) => Math.max(1, Math.floor(actor.level / 2)),
    sequenceArray,
    // equipment
    damageLabel: (damage) => {
      return game.i18n.localize(CONFIG.PF2E.weaponDamage[damage]);
    },
    weaponTraitLabel: (trait) => {
      return game.i18n.localize(CONFIG.PF2E.weaponTraits[trait]);
    },
    weaponPropertyRunesLabel: (rune) => {
      return game.i18n.localize(CONFIG.PF2E.weaponPropertyRunes[rune]);
    },
    hasFreePropertySlot: (item) => {
      const potency = item.system.runes.potency;
      return potency > 0 && item.system.runes.property.length < potency;
    },
    getFreePropertyRuneSlot: (item) => {
      const potency = item.system.potencyRune.value;
      if (potency === null)
        return null;
      for (let i = 0; i < potency; i++) {
        const property = RUNE_PROPERTY_KEYS[i];
        if (!item.system[property].value)
          return property;
      }
      return null;
    },
    // actor
    getPlayersActors: (member, ...types) => {
      if (!types.length)
        types = ["creature"];
      let actors = game.actors;
      if (member) {
        const members = getSetting("members") ? Array.from(member.parties ?? []).flatMap((p) => p.members) : null;
        if (members)
          actors = members;
        else
          actors = actors.filter((a) => a.hasPlayerOwner);
        if (member instanceof Actor)
          actors = actors.filter((a) => a !== member);
      } else
        actors = actors.filter((a) => a.hasPlayerOwner);
      return actors.filter((a) => a.isOfType(...types));
    }
  };
  function openDailiesInterface(actor) {
    if (!actor || !actor.isOfType("character") || !actor.isOwner) {
      const controlled = canvas.tokens.controlled;
      actor = controlled.find((token) => token.actor?.isOfType("character") && token.actor.isOwner)?.actor;
      if (!actor)
        actor = game.user.character;
    }
    if (!actor || !actor.isOfType("character") || !actor.isOwner)
      return warn("error.noCharacterSelected");
    if (getFlag(actor, "rested") !== true)
      return warn("error.unrested");
    new DailiesInterface(actor, { title: localize("interface.title", { name: actor.name }) }).render(true);
  }
  __name(openDailiesInterface, "openDailiesInterface");
  function requestDailies() {
    if (!game.user.isGM)
      return warn("error.notGM");
    createWatchChatMessage();
  }
  __name(requestDailies, "requestDailies");

  // src/actor.js
  async function onPerformDailyCrafting() {
    const entries = (await this.getCraftingEntries()).filter((e) => e.isDailyPrep);
    const alchemicalEntries = entries.filter((e) => e.isAlchemical);
    const reagentCost = alchemicalEntries.reduce((sum, entry) => sum + entry.reagentCost, 0);
    const reagentValue = (this.system.resources.crafting.infusedReagents.value || 0) - reagentCost;
    if (reagentValue < 0) {
      ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
      return;
    } else {
      await this.update({ "system.resources.crafting.infusedReagents.value": reagentValue });
    }
    for (const entry of entries) {
      for (const formula of entry.preparedCraftingFormulas) {
        const itemSource = formula.item.toObject();
        itemSource.system.quantity = formula.quantity;
        itemSource.system.temporary = true;
        itemSource.system.size = this.ancestry?.size === "tiny" ? "tiny" : "med";
        if (entry.isAlchemical && (itemSource.type === "consumable" || itemSource.type === "weapon" || itemSource.type === "equipment")) {
          itemSource.system.traits.value.push("infused");
        }
        await this.addToInventory(itemSource);
      }
    }
  }
  __name(onPerformDailyCrafting, "onPerformDailyCrafting");
  function renderCharacterSheetPF2e(sheet, html) {
    const actor = sheet.actor;
    if (!actor.isOwner)
      return;
    const small = html.find("aside .sidebar .hitpoints .hp-small");
    small.append(`<a class="roll-icon dailies" data-tooltip="${localize("sheet.title")}"><i class="fas fa-mug-saucer"></i></a>`).find(".dailies").on("click", () => openDailiesInterface(actor));
  }
  __name(renderCharacterSheetPF2e, "renderCharacterSheetPF2e");

  // src/apps/custom/flexibility.js
  var flexibility = [
    "/** @typedef {'flexibility' | 'improved'} FlexibilityRow */",
    "/** @typedef {'improved'} FlexibilityChild */",
    "/** @typedef {[FlexibilityRow, {}, FlexibilityChild]} FlexibilityGenerics */",
    "",
    "/**",
    " * @param {FlexibilityRow} slug",
    " * @param {number} level",
    " * @param {FlexibilityChild} [child]",
    " */",
    "function createRow(slug, level, child) {",
    "    /** @type {DailyRowDrop<FlexibilityGenerics>} */",
    "    const row = {",
    "        type: 'drop',",
    "        label: `PF2E.Level${level}`,",
    "        slug,",
    "        filter: {",
    "            type: 'feat',",
    "            search: {",
    "                category: ['class'],",
    "                traits: {",
    "                    values: ['fighter'],",
    "                },",
    "                level,",
    "            },",
    "        },",
    "    }",
    "    if (child) row.childPredicate = [child]",
    "    return row",
    "}",
    "",
    "/** @type {Daily<FlexibilityGenerics>} */",
    "const combatFlexibility = {",
    "    key: 'flexibility',",
    "    item: {",
    "        uuid: 'Compendium.pf2e.classfeatures.Item.8g6HzARbhfcgilP8', // Combat Flexibility",
    "    },",
    "    children: [",
    "        {",
    "            slug: 'improved',",
    "            uuid: 'Compendium.pf2e.classfeatures.Item.W2rwudMNcAxs8VoX', // Improved Flexibility",
    "        },",
    "    ],",
    "    rows: [",
    "        createRow('flexibility', 8), //",
    "        createRow('improved', 14, 'improved'),",
    "    ],",
    "    process: async ({ utils, fields, addFeat, messages, children }) => {",
    "        const uuid = fields.flexibility.uuid",
    "        const source = await utils.createFeatSource(uuid)",
    "        addFeat(source)",
    "        messages.add('feats', { uuid })",
    "",
    "        if (children.improved) {",
    "            const uuid = fields.improved.uuid",
    "            const source = await utils.createFeatSource(uuid)",
    "            addFeat(source, children.improved)",
    "            messages.add('feats', { uuid })",
    "        }",
    "    },",
    "}",
    "",
    "return combatFlexibility"
  ].join("\n");

  // src/apps/custom/mind.js
  var mind = [
    "/** @typedef {'alert' | 'smith' | 'mental' | 'runic' | 'advanced'} MindRow */",
    "/** @typedef {'weapon' | 'mental' | 'runic' | 'advanced'} MindChild */",
    "/** @typedef {[MindRow, {}, MindChild]} MindGenerics */",
    "",
    "const MIND_WEAPON_UUID = 'Compendium.pf2e-dailies.equipment.Item.VpmEozw21aRxX15P'",
    "",
    "const WEAPON_BASE_TYPES = {",
    "    0: { die: 'd4', traits: ['finesse', 'agile'], usage: 'held-in-one-hand' },",
    "    1: { die: 'd6', traits: ['finesse'], usage: 'held-in-one-hand' },",
    "    2: { die: 'd8', traits: [], usage: 'held-in-one-hand' },",
    "    3: { die: 'd10', traits: ['reach'], usage: 'held-in-two-hands' },",
    "}",
    "",
    "const WEAPON_GROUPS = /** @type {Record<WeaponDamage, string>} */ {",
    "    slashing: 'sword',",
    "    piercing: 'spear',",
    "    bludgeoning: 'club',",
    "}",
    "",
    "const WEAPON_TRAITS = ['grapple', 'nonlethal', 'shove', 'trip', 'modular']",
    "",
    "const WEAPON_DAMAGE_TYPES = Object.keys(WEAPON_GROUPS)",
    "",
    "const WEAPON_RUNES = ['corrosive', 'disrupting', 'flaming', 'frost', 'shock', 'thundering']",
    "",
    "const WEAPON_GREATER_RUNES = [",
    "    'anarchic',",
    "    'axiomatic',",
    "    'greaterCorrosive',",
    "    'greaterDisrupting',",
    "    'greaterFlaming',",
    "    'greaterFrost',",
    "    'greaterShock',",
    "    'greaterThundering',",
    "    'holy',",
    "    'unholy',",
    "]",
    "",
    "/** @type {Daily<MindGenerics>} */",
    "const mindSmith = {",
    "    key: 'mindsmith',",
    "    item: {",
    "        uuid: 'Compendium.pf2e.feats-srd.Item.juikoiIA0Jy8PboY', // Mind Smith Dedication",
    "    },",
    "    children: [",
    "        {",
    "            slug: 'weapon',",
    "            uuid: MIND_WEAPON_UUID, // Mind Weapon",
    "        },",
    "        {",
    "            slug: 'mental',",
    "            uuid: 'Compendium.pf2e.feats-srd.Item.PccekOihIbRWdDky', // Malleable Mental Forge",
    "        },",
    "        {",
    "            slug: 'runic',",
    "            uuid: 'Compendium.pf2e.feats-srd.Item.2uQbQgz1AbjzcFSp', // Runic Mind Smithing",
    "        },",
    "        {",
    "            slug: 'advanced',",
    "            uuid: 'Compendium.pf2e.feats-srd.Item.fgnfXwFcn9jZlXGD', // Advanced Runic Mind Smithing",
    "        },",
    "    ],",
    "    rows: [",
    "        {",
    "            type: 'alert',",
    "            slug: 'alert',",
    "            message: 'Missing Mind Weapon',",
    "            fix,",
    "            childPredicate: [{ not: 'weapon' }],",
    "        },",
    "        {",
    "            type: 'select',",
    "            slug: 'smith',",
    "            label: 'Mind Smith',",
    "            options: WEAPON_DAMAGE_TYPES,",
    "            labelizer: ({ utils }) => utils.damageLabel,",
    "            childPredicate: ['weapon'],",
    "        },",
    "        {",
    "            type: 'select',",
    "            slug: 'mental',",
    "            label: 'Mental Forge',",
    "            options: WEAPON_TRAITS,",
    "            labelizer: ({ utils }) => utils.weaponTraitLabel,",
    "            childPredicate: ['weapon', 'mental'],",
    "        },",
    "        {",
    "            type: 'select',",
    "            slug: 'runic',",
    "            label: 'Runic Smithing',",
    "            options: WEAPON_RUNES,",
    "            labelizer: ({ utils }) => utils.weaponPropertyRunesLabel,",
    "            childPredicate: ['weapon', 'runic', { not: 'advanced' }],",
    "            condition: ({ children, utils }) => utils.hasFreePropertySlot(children.weapon),",
    "        },",
    "        {",
    "            type: 'select',",
    "            slug: 'advanced',",
    "            label: 'Runic Smithing',",
    "            options: WEAPON_GREATER_RUNES,",
    "            labelizer: ({ utils }) => utils.weaponPropertyRunesLabel,",
    "            childPredicate: ['weapon', 'advanced'],",
    "            condition: ({ children, utils }) => utils.hasFreePropertySlot(children.weapon),",
    "        },",
    "    ],",
    "    process: ({ children, updateItem, fields, messages, item, utils }) => {",
    "        const weapon = children.weapon",
    "        if (!weapon) return",
    "",
    "        messages.addGroup('mindsmith')",
    "",
    "        const selected = /** @type {WeaponDamage} */ fields.smith.value",
    "        updateItem({ _id: weapon.id, 'system.damage.damageType': selected, 'system.group': WEAPON_GROUPS[selected] })",
    "        messages.add('mindsmith', { selected: utils.damageLabel(selected), uuid: item.uuid, label: 'mindsmith' })",
    "",
    "        if (children.mental) {",
    "            const selected = fields.mental.value",
    "            const traits = deepClone(weapon._source.system.traits?.value ?? [])",
    "            if (!traits.includes(selected)) traits.push(selected)",
    "            updateItem({ _id: weapon.id, 'system.traits.value': traits })",
    "            messages.add('mindsmith', {",
    "                selected: utils.weaponTraitLabel(selected),",
    "                uuid: children.mental.uuid,",
    "                label: 'mentalforge',",
    "            })",
    "        }",
    "",
    "        if ((children.advanced || children.runic) && utils.hasFreePropertySlot(weapon)) {",
    "            const child = children.advanced ?? children.runic",
    "            const freeSlot = utils.getFreePropertyRuneSlot(weapon)",
    "            const field = fields.advanced ?? fields.runic",
    "            const selected = field.value",
    "",
    "            if (!weapon.system.runes.property.includes(selected)) {",
    "                updateItem({ _id: weapon.id, [`system.${freeSlot}.value`]: selected, [`flags.world.runeSlot`]: freeSlot })",
    "                messages.add('mindsmith', {",
    "                    selected: utils.weaponPropertyRunesLabel(selected),",
    "                    uuid: child.uuid,",
    "                    label: 'runicmind',",
    "                })",
    "            }",
    "        }",
    "    },",
    "    rest: ({ item, sourceId, updateItem }) => {",
    "        if (sourceId !== MIND_WEAPON_UUID) return",
    "",
    "        let traits = item._source.system.traits?.value ?? []",
    "        traits = traits.filter(trait => !WEAPON_TRAITS.includes(trait))",
    "        updateItem({ _id: item.id, 'system.traits.value': traits })",
    "",
    "        const runeSlot = item.getFlag('world', 'runeSlot')",
    "        if (runeSlot) {",
    "            updateItem({ _id: item.id, [`system.${runeSlot}.value`]: null, [`flags.world.-=runeSlot`]: true })",
    "        }",
    "    },",
    "}",
    "",
    "const OPTIONS = {",
    "    0: 'A one-handed weapon that deals <strong>1d4</strong> damage and has the <strong>agile</strong> and <strong>finesse</strong> traits',",
    "    1: 'A one-handed weapon that deals <strong>1d6</strong> damage and has the <strong>finesse</strong> trait',",
    "    2: 'A one-handed weapon that deals <strong>1d8</strong> damage',",
    "    3: 'A two-handed weapon that deals <strong>1d10</strong> damage and has the <strong>reach</strong> trait',",
    "}",
    "",
    "/** * @param {DailyValueArgs<MindGenerics>} args */",
    "async function fix({ actor }) {",
    "    let content =",
    "        `<p>This character doesn't have a mind weapon in their inventory.</p><p>Please select one of the following options to create one.</p>`",
    "",
    "    for (const [key, label] of Object.entries(OPTIONS)) {",
    "        content += `<label><input type='radio' name='type' value='${key}'>${label}</label>`",
    "    }",
    "",
    "    const weapon = await Dialog.wait(",
    "        {",
    "            title: 'Mind Weapon',",
    "            content,",
    "            buttons: {",
    "                yes: {",
    "                    icon: `<i class='fas fa-save'></i>`,",
    "                    label: 'Accept',",
    "                    callback: onWeaponSelected,",
    "                },",
    "                no: {",
    "                    icon: `<i class='fas fa-times'></i>`,",
    "                    label: 'Cancel',",
    "                    callback: () => null,",
    "                },",
    "            },",
    "            close: () => null,",
    "        },",
    "        {},",
    "        { id: 'pf2e-dailies-weapon', width: 600 }",
    "    )",
    "",
    "    if (weapon) {",
    "        await actor.createEmbeddedDocuments('Item', [weapon])",
    "        return true",
    "    }",
    "",
    "    return false",
    "}",
    "",
    "/** @params {JQuery} html */",
    "async function onWeaponSelected(html) {",
    "    const selection = html.find('[name=type]:checked').val()",
    "    if (!selection) {",
    "        ui.notifications.warn('You must select one weapon base type.')",
    "        return",
    "    }",
    "",
    "    const weapon = (await fromUuid(MIND_WEAPON_UUID))?.toObject()",
    "    if (!weapon) {",
    "        ui.notifications.warn(`The weapon couldn't be found in the compendium.`)",
    "        return",
    "    }",
    "",
    "    const stats = WEAPON_BASE_TYPES[selection]",
    "",
    "    setProperty(weapon, 'system.damage.die', stats.die)",
    "    setProperty(weapon, 'system.traits.value', stats.traits.slice())",
    "    setProperty(weapon, 'system.usage.value', stats.usage)",
    "",
    "    return weapon",
    "}",
    "",
    "return mindSmith"
  ].join("\n");

  // src/apps/custom/savant.js
  var savant = [
    "/** @typedef {'first' | 'second' | 'third' | 'fourth'} SavantRow */",
    "/** @typedef {Record<SavantRow, { level: number; condition: boolean }>} SavantCustom */",
    "/** @typedef {[SavantRow, SavantCustom, '']} SavantGenerics */",
    "",
    "const ROWS = /** @type {const} */ (['first', 'second', 'third', 'fourth'])",
    "",
    "/**",
    " * @param {CharacterPF2e} actor",
    " * @param {MagicTradition} tradition",
    " */",
    "function getSpellcastingTraditionDetails(actor, tradition) {",
    "    let maxSlot = 1",
    "    let maxTradition = 0",
    "",
    "    for (const entry of actor.spellcasting.regular) {",
    "        if ('pf2e-staves' in entry.flags) continue // we skip staff entries",
    "",
    "        const slots = entry.system.slots",
    "        for (const key in slots) {",
    "            const slot = slots[key]",
    "            if (slot.max) maxSlot = Math.max(maxSlot, Number(key.slice(4)))",
    "        }",
    "",
    "        if (entry.tradition === tradition) maxTradition = Math.max(maxTradition, entry.rank)",
    "    }",
    "",
    "    return { maxSlot: Math.min(maxSlot, 10), maxTradition }",
    "}",
    "",
    "/** @type {Daily<SavantGenerics>} */",
    "const scrollSavant = {",
    "    key: 'savant',",
    "    item: {",
    "        uuid: 'Compendium.pf2e.feats-srd.Item.u5DBg0LrBUKP0JsJ', // Scroll Savant",
    "    },",
    "    prepare: ({ actor }) => {",
    "        const { maxSlot, maxTradition } = getSpellcastingTraditionDetails(actor, 'arcane')",
    "        return {",
    "            first: { level: maxSlot - 2, condition: true },",
    "            second: { level: maxSlot - 3, condition: true },",
    "            third: { level: maxSlot - 4, condition: maxTradition >= 3 && maxSlot >= 5 },",
    "            fourth: { level: maxSlot - 5, condition: maxTradition >= 4 && maxSlot >= 6 },",
    "        }",
    "    },",
    "    rows: ROWS.map(rowName => {",
    "        /** @type {DailyRowDrop<SavantGenerics>} */",
    "        const row = {",
    "            type: 'drop',",
    "            slug: rowName,",
    "            label: ({ custom }) => `PF2E.SpellLevel${custom[rowName].level}`,",
    "            filter: {",
    "                type: 'spell',",
    "                search: ({ custom }) => ({",
    "                    category: ['spell'],",
    "                    traditions: ['arcane'],",
    "                    level: custom[rowName].level,",
    "                }),",
    "            },",
    "            condition: ({ custom }) => custom[rowName].condition,",
    "        }",
    "        return row",
    "    }),",
    "    process: async ({ utils, fields, custom, addItem, messages }) => {",
    "        for (const field of Object.values(fields)) {",
    "            const uuid = field.uuid",
    "            const source = await utils.createSpellScrollSource({ uuid, level: custom[field.row].level })",
    "            addItem(source)",
    "            messages.add('scrolls', { uuid, label: source.name })",
    "        }",
    "    },",
    "}",
    "",
    "return scrollSavant"
  ].join("\n");

  // src/apps/custom/tome.js
  var tome = [
    "/** @typedef {typeof ROWS[number]} TomeRow */",
    "/** @typedef {'adept' | 'second' | 'intense' | 'paragon'} TomeChild */",
    "/** @typedef {Record<TomeRow, { rank: OneToFour; options: string[] }>} TomeCustom */",
    "/** @typedef {[TomeRow, TomeCustom, TomeChild]} TomeGenerics */",
    "",
    "const ROWS = /** @type {const} */ (['first', 'second'])",
    "",
    "/** @param {'adept' | 'paragon'} option */",
    "function createChildCondition(option) {",
    "    /** @type { BaseDailyConditionFunction<TomeGenerics>} */",
    "    const condition = ({ item, utils }) => {",
    "        return utils.getChoiSetRuleSelection(item, option) === 'tome'",
    "    }",
    "    return condition",
    "}",
    "",
    "/** @type {Daily<TomeGenerics>} */",
    "const thaumaturgeTome = {",
    "    key: 'tome',",
    "    item: {",
    "        uuid: 'Compendium.pf2e.classfeatures.Item.MyN1cQgE0HsLF20e', // Tome",
    "    },",
    "    children: [",
    "        {",
    "            slug: 'adept',",
    "            uuid: 'Compendium.pf2e.classfeatures.Item.Obm4ItMIIr0whYeO', // Implement Adept",
    "            condition: createChildCondition('adept'),",
    "        },",
    "        {",
    "            slug: 'second',",
    "            uuid: 'Compendium.pf2e.classfeatures.Item.ZEUxZ4Ta1kDPHiq5', // Second Adept",
    "            condition: createChildCondition('adept'),",
    "        },",
    "        {",
    "            slug: 'intense',",
    "            uuid: 'Compendium.pf2e.feats-srd.Item.yRRM1dsY6jakEMaC', // Intense Implement",
    "        },",
    "        {",
    "            slug: 'paragon',",
    "            uuid: 'Compendium.pf2e.classfeatures.Item.QEtgbY8N2V4wTbsI', // Implement Paragon",
    "            condition: createChildCondition('paragon'),",
    "        },",
    "    ],",
    "    prepare: ({ utils, actor, children }) => {",
    "        const skillNames = utils.skillNames",
    "        const actorLevel = actor.level",
    "        const actorSkills = /** @type {Record<SkillLongForm, { rank: ZeroToFour }>} */ (actor.skills)",
    "",
    "        /** @type {TomeCustom} */",
    "        const custom = {",
    "            first: { options: [], rank: 1 },",
    "            second: { options: [], rank: 1 },",
    "        }",
    "",
    "        // Implement Paragon",
    "        if (children.paragon) {",
    "            const skills = skillNames.filter(x => actorSkills[x].rank < 4)",
    "            custom.first = { rank: 4, options: skills }",
    "            custom.second = { rank: 4, options: skills }",
    "        }",
    "        // Intense Implement or Second Adept or Implement Adept",
    "        else if (children.intense || children.adept || children.second) {",
    "            const masters = skillNames.filter(x => actorSkills[x].rank < 3)",
    "",
    "            if (actorLevel >= 9) {",
    "                custom.first = { rank: 3, options: masters }",
    "                custom.second = { rank: 3, options: masters }",
    "            } else {",
    "                const experts = skillNames.filter(x => actorSkills[x].rank < 2)",
    "                custom.first = { rank: 2, options: experts }",
    "                custom.second = { rank: 3, options: masters }",
    "            }",
    "        }",
    "        // Tome",
    "        else {",
    "            if (actorLevel >= 5) {",
    "                const experts = skillNames.filter(x => actorSkills[x].rank < 2)",
    "                custom.first = { rank: 2, options: experts }",
    "                custom.second = { rank: 2, options: experts }",
    "            } else if (actorLevel >= 3) {",
    "                const trained = skillNames.filter(x => actorSkills[x].rank < 1)",
    "                const experts = skillNames.filter(x => actorSkills[x].rank < 2)",
    "                custom.first = { rank: 1, options: trained }",
    "                custom.second = { rank: 2, options: experts }",
    "            } else {",
    "                const trained = skillNames.filter(x => actorSkills[x].rank < 1)",
    "                custom.first = { rank: 1, options: trained }",
    "                custom.second = { rank: 1, options: trained }",
    "            }",
    "        }",
    "",
    "        return custom",
    "    },",
    "    rows: ROWS.map(rowName => {",
    "        /** @type {DailyRowCombo<TomeGenerics>} */",
    "        const row = {",
    "            type: 'combo',",
    "            slug: rowName,",
    "            label: ({ custom, utils }) => utils.proficiencyLabel(custom[rowName].rank),",
    "            options: ({ custom }) => custom[rowName].options,",
    "            labelizer: ({ utils }) => utils.skillLabel,",
    "        }",
    "        return row",
    "    }),",
    "    process: ({ custom, fields, utils, messages, addItem, addRule }) => {",
    "        messages.addGroup('tome', 65)",
    "",
    "        for (const rowName of ROWS) {",
    "            const rank = custom[rowName].rank",
    "            let value = fields[rowName].value",
    "",
    "            if (fields[rowName].input === 'true') {",
    "                const source = utils.createLoreSource({ name: value, rank })",
    "                addItem(source)",
    "            } else {",
    "                const source = utils.createSkillRuleElement({ skill: value, value: rank })",
    "                value = utils.skillLabel(value)",
    "                addRule(source)",
    "            }",
    "",
    "            messages.add('tome', { label: utils.proficiencyLabel(rank), selected: value })",
    "        }",
    "    },",
    "}",
    "",
    "return thaumaturgeTome"
  ].join("\n");

  // src/apps/custom.js
  var localize4 = subLocalize("customs");
  var TEMPLATES = ["default", "trainedSkill", "trainedLore", "language", "resistance", "feat", "spell"];
  var EXAMPLES = ["flexibility", "savant", "tome", "mind"];
  var DailyCustoms = class extends FormApplication {
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        id: "pf2e-dailies-customs",
        title: localize4("title"),
        template: templatePath("customs.hbs"),
        submitOnChange: false,
        submitOnClose: false,
        closeOnSubmit: false,
        scrollY: [".left .list"]
      });
    }
    async _updateObject(event, formData) {
    }
    async getData(options) {
      const customs = getSetting("customDailies");
      const code = customs.find((custom) => custom.key === this._selectedDaily)?.code;
      const template = this._selectedTemplate;
      const extension = game.modules.get("pf2e-dailies-ext");
      const newVersion = extension?.active && isNewerVersion(EXT_VERSION, extension.version) ? { version: EXT_VERSION } : "";
      return mergeObject(super.getData(options), {
        i18n: localize4,
        template,
        templates: TEMPLATES,
        daily: this._selectedDaily,
        code,
        customs,
        examples: EXAMPLES,
        isExample: EXAMPLES.includes(template),
        monaco: extension?.active,
        newVersion
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
        this._monaco.onDidChangeModelContent(debounce(() => area.value = this._monaco.getValue(), 200));
      } else {
        this._monaco = null;
      }
      html.find("[data-action=select-template]").on("change", this.#onSelectTemplate.bind(this));
      html.find("[data-action=create-template]").on("click", this.#onCreateTemplate.bind(this));
      html.find("[data-action=create-daily]").on("click", this.#onCreateDaily.bind(this));
      html.find(".row[data-key]").on("click", this.#onSelectDaily.bind(this));
      html.find("[data-action=delete-daily]").on("click", this.#onDeleteDaily.bind(this));
      html.find("[data-action=save-code]").on("click", this.#onSaveCode.bind(this));
    }
    get code() {
      const element = this.form.querySelector(".window-content .code");
      return element?.value;
    }
    async #onSaveCode(event) {
      event.preventDefault();
      const code = this.code;
      const selected = this._selectedDaily;
      if (!selected || !code)
        return;
      const customs = getSetting("customDailies");
      const stipped = customs.filter((custom) => custom.key !== selected);
      try {
        const fn = new AsyncFunction(code);
        const daily = await fn();
        const key = daily.key;
        if (typeof key !== "string")
          return warn("invalidKey");
        if (stipped.find((custom) => custom.key === key))
          return warn("duplicate");
        const index = customs.findIndex((custom) => custom.key === selected);
        if (index < 0)
          return;
        customs.splice(index, 1, { key, code });
        await setSetting("customDailies", customs);
        localize4.info("saved", { daily: key });
        this._selectedDaily = key;
        this.render();
      } catch (err) {
        error("error.unexpected");
        console.error(err);
        console.error(`The error occured while testing the custom daily ${selected}`);
      }
    }
    async #onDeleteDaily(event) {
      event.preventDefault();
      event.stopPropagation();
      const remove = await Dialog.confirm({
        title: localize4("delete.title"),
        content: localize4("delete.content")
      });
      if (!remove)
        return;
      const key = event.currentTarget.dataset.key;
      const customs = getSetting("customDailies").filter((custom) => custom.key !== key);
      await setSetting("customDailies", customs);
      localize4.info("deleted", { daily: key });
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
        return localize4.warn("template.noEmpty");
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
        code = this.#stringifyDaily(daily, { key, uuid, label }, "LanguageGenerics");
      } else if (template === "resistance") {
        const resistance = simplyfiable(data.resistance);
        const resistances = splitList(data.resistances);
        if (resistance === "" || !resistances.length)
          return localize4.warn("template.noEmpty");
        if (typeof resistance === "number" && resistance < 1)
          return localize4.warn("template.badResistance");
        const daily = createResistancelDaily(key, uuid, resistances, resistance, label);
        code = this.#stringifyDaily(daily, { key, uuid, label, resistance, resistances }, "ResistanceGenerics");
      } else if (template === "feat") {
        const traits = splitList(data.traits);
        const filter = {
          category: splitList(data.category),
          level: simplyfiable(data.level) || { min: 0, max: 20 }
        };
        if (traits.length)
          filter.traits = traits;
        const daily = createFeatDaily(key, uuid, filter, label);
        code = this.#stringifyDaily(daily, { key, uuid, label }, "FeatGenerics");
      } else if (template === "spell") {
        const level = Number(data.level) || void 0;
        const traits = splitList(data.traits);
        let levels = data.levels.split(",").map((x) => x.trim());
        if (levels.length === 1) {
          levels = simplyfiable(levels[0]);
        } else {
          levels = levels.filter((x) => x).map((x) => Number(x)).filter((x) => !isNaN(x));
        }
        const filter = {
          category: splitList(data.category),
          traditions: splitList(data.traditions),
          level: levels || []
        };
        if (traits.length)
          filter.traits = traits;
        const daily = createSpellDaily(key, uuid, filter, level, label);
        code = this.#stringifyDaily(daily, { key, uuid, label, level }, "SpellGenerics");
      } else if (template === "tome") {
        code = tome;
      } else if (template === "flexibility") {
        code = flexibility;
      } else if (template === "savant") {
        code = savant;
      } else if (template === "mind") {
        code = mind;
      } else {
        const daily = { key, label, item: { uuid }, rows: [], process: () => {
        } };
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
        4
      );
      str = str.replace(new RegExp('"' + placeholder + '"', "g"), () => {
        const fn = fns.shift()?.toString();
        return fn?.replace(/( {5,})/g, (match) => match.slice(4)) ?? "";
      });
      let strArgs = "";
      for (const [key, value] of Object.entries(args)) {
        if (typeof value === "string")
          strArgs += `const ${key} = '${value}';
`;
        else if (typeof value === "object")
          strArgs += `const ${key} = ${JSON.stringify(value)};
`;
        else
          strArgs += `const ${key} = ${value};
`;
      }
      const typing = type ? `Daily<${type}>` : "Daily";
      return `${strArgs}
/** @type {${typing}} */
const daily = ${str};

return daily;`;
    }
    #onSelectTemplate(event) {
      event.preventDefault();
      this._selectedDaily = "";
      this._selectedTemplate = event.currentTarget.value;
      this.render();
    }
  };
  __name(DailyCustoms, "DailyCustoms");
  function splitList(list) {
    return list.split(",").map((x) => x.trim()).filter((x) => x);
  }
  __name(splitList, "splitList");
  function simplyfiable(value) {
    if (typeof value === "number")
      return value;
    value = value.trim();
    if (value === "level" || value === "half")
      return value;
    const numbered = Number(value);
    return isNaN(numbered) ? "" : numbered;
  }
  __name(simplyfiable, "simplyfiable");

  // src/rest.js
  async function restForTheNight(actor) {
    const update = [];
    const remove = [];
    for (const item of actor.items) {
      if (getFlag(item, "temporary")) {
        remove.push(item.id);
        if (item.isOfType("feat")) {
          const parentId = getFlag(item, "grantedBy");
          if (parentId) {
            const slug = sluggify(item.name, { camel: "dromedary" });
            const path = `flags.pf2e.itemGrants.-=${slug}`;
            update.push({ _id: parentId, [path]: true });
          }
        }
        continue;
      }
      const sourceId = getSourceId(item);
      if (sourceId) {
        const daily = getDailyFromSourceId(sourceId);
        if (daily?.rest) {
          await daily.rest({ item, sourceId, updateItem: (data) => update.push(data) });
        }
      }
      const rules = deepClone(item._source.system.rules);
      let modifiedRules = false;
      for (let i = rules.length - 1; i >= 0; i--) {
        if (MODULE_ID in rules[i]) {
          rules.splice(i, 1);
          modifiedRules = true;
        }
      }
      if (modifiedRules)
        update.push({ _id: item.id, "system.rules": rules });
    }
    if (update.length)
      await actor.updateEmbeddedDocuments("Item", update);
    if (remove.length)
      await actor.deleteEmbeddedDocuments("Item", remove);
    await setFlag(actor, "rested", true);
  }
  __name(restForTheNight, "restForTheNight");

  // src/main.js
  var EXT_VERSION = "1.3.0";
  var DAILY_CRAFTING = "CONFIG.PF2E.Actor.documentClasses.character.prototype.performDailyCrafting";
  Hooks.once("setup", () => {
    registerSetting({
      name: "customDailies",
      type: Array,
      default: [],
      onChange: parseCustomDailies
    });
    registerSetting({
      name: "familiar",
      type: String,
      default: "",
      config: true
    });
    registerSetting({
      name: "watch",
      type: Boolean,
      default: false,
      config: true,
      onChange: enableWatchHook
    });
    registerSetting({
      name: "members",
      type: Boolean,
      default: true,
      config: true,
      scope: "user"
    });
    registerSettingMenu({
      name: "customs",
      type: DailyCustoms
    });
    game.modules.get(MODULE_ID).api = {
      openDailiesInterface: (actor) => openDailiesInterface(actor),
      requestDailies,
      getBuiltinDailies: () => deepClone(BUILTINS_DAILIES),
      getCustomDailies: () => deepClone(CUSTOM_DAILIES),
      prepareDailies,
      checkCustomDaily,
      getUtils: () => deepClone(utils)
    };
    if (getSetting("watch"))
      enableWatchHook(true);
  });
  Hooks.once("ready", async () => {
    await parseCustomDailies();
    if (!game.modules.get("lib-wrapper")?.active && game.user.isGM) {
      warn("error.noLibwrapper", true);
      return;
    }
    libWrapper.register(MODULE_ID, DAILY_CRAFTING, onPerformDailyCrafting, "OVERRIDE");
  });
  Hooks.on("pf2e.restForTheNight", restForTheNight);
  Hooks.on("renderCharacterSheetPF2e", renderCharacterSheetPF2e);
  function enableWatchHook(enabled) {
    Hooks[enabled ? "on" : "off"]("renderChatMessage", renderChatMessage);
  }
  __name(enableWatchHook, "enableWatchHook");
})();
//# sourceMappingURL=main.js.map
