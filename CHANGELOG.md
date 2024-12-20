# 3.16.0

-   this is a system `6.8.0` release
-   updated the dailies filter validations to be compatible with the new compendium browser
-   `Custom Dailies`:
    -   add a `temporary` option to the `addItem` & `addFeat` process helpers
        -   if set to `false` the item will not be temporary
    -   add new `replaceFeat` process helper
        -   it will replace an existing feat on the character by the one provided
        -   if the original feat had a parent, the new feat will be place as a child to it in the sheet

# 3.15.0

-   the module now uses a migration manager
    -   the main GM will be asked to migrate on load
    -   if the system is migrating data, make sure to wait until it is done before starting
-   `Apparition Attunement`:
    -   no longer add the `*` prefix to primary vessel spells
    -   now add a star icon to assign/unassign primary vessel spells
        -   unassigned primary vessel spells cannot be cast
-   `Custom Dailies`:
    -   the `setExtraFlags` object is now put behind the daily key context
        -   so what was before `flags.pf2e-dailies.extra.{}` is now `flags.pf2e-dailies.extra.custom.my-daily.{}`
    -   add a `temporary` option to the `deleteItem` process helper
        -   on rest, items deleted while using this option will be re-added to the actor as they were
    -   add `config` function to dailies
        -   used to register the daily own configs like the `animist` and `familiar` dailies do
    -   add `afterItemAdded` function to dailies
        -   called after all items (from all dailies) have been added to the actor but before any were removed or updated
        -   the `addedItems` contains the items related to the current daily
        -   you can use all the process helpers except the ones that add anything to the actor

# 3.14.0

-   `Apparition Attunement`:
    -   add support for the `Circle of Spirits` feat
    -   now add all vessel spells to the focus spellcasting entry
        -   make it easier to swap during the day
        -   mark the primary vessel spells with a prefix `*` in their name
        -   subtract the excess focus points to leave only the amount the character should have without the extra vessel spells
-   `Custom Dailies`:
    -   add `label` to the options argument of `createComboSkillDaily`
    -   add an extra options argument to `createLoreSkillDaily`
    -   add a new `hasItemWithSourceId` helper to `utils`

# 3.13.0

-   this is a system `6.7.1` release
-   change the `Perform Daily Crafting` handling to work with the latest system changes
    -   move from `Actor#performDailyCrafting` to `ActorInventory#deleteTemporaryItems`
-   `Apparition Attunement`:
    -   add new `Set Signature Spells` config option (enabled by default)
        -   when enabled, all spells added by the module will be set as signature spells by default
        -   when disabled, only the `Heal`, `Harm` and `Animal Form` will

# 3.12.0

-   `Apparition Attunement`:
    -   add support for the `Medium` dual invocation
        -   both vessels will be added which will automatically give a second focus point to the animist
-   some internal changes as well

# 3.11.0

-   this is a system `6.7.0` release
-   updated the `performDailyCrafting` to be compatible with latest system version
    -   it will now delete any temporary item that isn't part of the crafting special resource as well as not have been added by the module

# 3.10.0

-   add support for the `Proteankin` feat (from `Nephilim` heritage)
-   `Apparition Attunement`:
    -   now add the `Animal Form` spell if you have the `Walk the Wilds` class feat
        -   set it as signature spells by default

# 3.9.0

-   add a new `Homebrew Settings` menu
    -   this is the place to add homebrew entries for the dailies that allow it
        -   hombrew entries will be added as options to the daily
        -   you can use the ID of a compendium pack or the UUID of an item to add entries
        -   this replaces the previous `Familiar Abilities` setting, you have to set it up again
-   `Apparition Attunement`:
    -   now accepts the use of homebrew apparitions via the new `Homebrew Settings`
    -   make sure to not add duplicate spells
-   `Familiar Abilities`:
    -   now uses the new `Homebrew Settings` feature instead, the old `Familiar Abilities` setting is removed and its value not kept, you gonna have to set it up anew
-   add `getItemTypeLabel` helper to the `utils` collection

# 3.8.2

-   `Apparition Attunement`:
    -   fix 10th rank slot only being considered at character level 20 instead of level 19

# 3.8.1

-   make sure all added spells are considered when checking for extra focus spells/points
-   `Apparition Attunement`:
    -   no longer add the vessel spell from all apparitions, only the primary
        -   the first apparition select is now considered as the primary
        -   adding more focus spells also adds more focus points, so this was "breaking" the character
    -   set static identifiers for the generated spellcasting entries
        -   useful for third parties
    -   fix cantrips missing on subsequent preparations (after the first one on load)

# 3.8.0

-   this is a system `6.6.0` release
-   add `Apparition Attunement` built-in daily (for the `Animist`)
    -   lets you select the apparition feats for the day (2~4 based on character level)
    -   automatically generates the focus and spontaneous spellcasting entries
    -   parse and add spells to the entries as well as setup the number of slots
        -   spells are not set as signature by default because of the crazy amount of rows it can create
    -   add the `Heal` & `Harm` spells if you have the `Embodiment of the Balance` class feat
        -   set them as signature spells by default for convenience
    -   add the `Avatar` spell if you have the `Supreme Incarnation` class feature
-   add a new `Notify` row
    -   this is a purely informative entry and has no interactivity
    -   there are no built-in dailies that use it, this is for custom dailies
-   add a new `getItemSource` helper in the `utils` collection
-   change the icon of the `Alert` row for a circle, the triangle is now used for the `Notify` row
-   if the number of max focus points has changed between the rest and daily preparation (because focus spells were added during preparation), the module will now add a number of current focus points equal to the difference between the before and after max values
-   expose `getDisabledDailies` and `getAnimistConfigs` to the API

# 3.7.3

-   fix being able to drop an embedded spell/feat into the drop field

# 3.7.2

-   remove debug stuff
-   make sure spellcasting entries max rank is never higher than actor level / 2

# 3.7.1

-   improve how spellcasting entries are checked for the purpose of finding the highest rank
    -   this will fix issues with characters who can only cast spells at a lower rank (due to dedication)

# 3.7.0

-   this is a system `6.4.0` release
-   mainly some behind the scene stuff
-   fix `performDailyCrafting` not working properly with the latest system version

# 3.6.1

-   fixed `Blade Armament` not being updated to PC2

# 3.6.0

-   this is a system `6.1.0` release
-   switched the remaining applications used by the module to `ApplicationV2`
-   minor styling updates for headers and the `Alert` field
-   fixed breaking changes with skills

# 3.5.3

-   added `canPrepareDailies` and `getDailiesSummary` api functions

# 3.5.2

-   fixed issue preventing the use of `counteract` with staff spells

# 3.5.1

-   add `getStaffItem` function to the API

# 3.5.0

-   switched the daily preparation & configs applications to `ApplicationV2`
-   fixed not being able to open the daily configs window
-   fixed "feat already present" tooltip not showing when hovering a drop field

# 3.4.0

-   this is a system `6.0.1` release
-   some internal changes have been made
-   now generates a daily preparation summary tooltip
    -   shows when hovering over the coffee cup icon in the character sheet
    -   contains the same details as the ones put in the chat message
-   add Polish localization (thanks to [Lioheart](https://github.com/Lioheart))

# 3.3.0

-   this is a foundry `12.324` release
-   modules can now declare their own custom dailies directly
    -   those dailies only exist when the module is enabled
    -   you can find more details in the wiki [Third Party Modules](https://github.com/reonZ/pf2e-dailies/wiki/Custom-Daily#third-party-modules) and [API](https://github.com/reonZ/pf2e-dailies/wiki/API)
-   fixed issue with items lacking a `sourceId` when using custom dailies

# 3.2.1

-   made the `Skilled` familiar ability not unique
-   fixed issue preventing the opening of the preparation interface
-   fixed issue with select fields not using the previous daily data

# 3.2.0

-   this is a `6.0.0-beta1` release
-   testing has been very light, you should be expecting some eventual breakages

# 3.1.5

-   added extra checks across the module to avoid missing elements errors

# 3.1.4

-   fixed staff selecting the worst spellcasting entry instead of the best

# 3.1.3

-   fixed error when observing a sheet that has `charges` spellcasting entries

# 3.1.2

-   fixed issue when adding spells to an existing entry

# 3.1.1

-   fixed error when a staff description doesn't have the required unordered list

# 3.1.0

-   change the `Filters` menu into a `Config`
    -   the list of enabled dailies is still there
    -   you will also find a slider to set the amount of familiar abilities you want to select during preparations, which make it easier to implement specific familiars

# 3.0.6

-   fixed spell links using the `@Compendium` format not working

# 3.0.5

-   make sure staff charges stay between 0 and max
-   sort familiar abilities dropdown options

# 3.0.4

-   fixed thaumaturge tome second adept issue

# 3.0.3

-   removed debug log

# 3.0.2

-   added an extra check to make sure only spells were added to the staff, in case the UUID for something else was provided in the description

# 3.0.1

-   make sure `Perform Daily Crafting` doesn't remove temporary items in case the daily preparations were done before
-   added missing `openDailiesInterface` function in the api
-   fixed broken link for expended flexible slots during staff prep

# 3.0.0

-   the module has been completely remade from scratch
-   daily selections made by a previous version will not be compatible
    -   they will be reset on each character the first time the preparation interface is opened
    -   from that point, everything will save properly between preparations
-   the module no longer has compendium packs
-   the module no longer interact with the chat (i never liked the idea to begin with)
    -   no more daily preparation button in the message generate by `Rest for the night`
    -   no more daily request macro
-   familiar abilities are no longer indiscriminately removed
    -   only abilities added by the module will be (starting from this version)
    -   familiar abilities are now removed on rest (previously only during daily prep)
    -   this should allow for more customizable familiars such as specific ones
-   the previously `Filter Out Dailies` user setting is now a per-character feature
    -   it can be accessed by clicking the `filters` button in the preparation interface header
-   temporary items added by the module will now be highlighted in the character and familiar sheets
    -   this can be disabled in the settings
-   drop filters' options and warnings have been significantly improved
-   drop feat rows will now warn if the feat is already present on the character
-   drop spell rows can now have extra notes to remind of eventual requirements that cannot be achieved with filters alone
-   it is no longer possible to accept or modify anything inside the preparation window whenever an `alert` field is present (beside resolving the issue itself)
-   spellcasting entries created by the module to house added spells will now be personalized to the feat/daily/actor
-   improved styling of the preparation interface to avoid inconsistencies
-   no longer have backward compatibility support for the `PF2e Staves` module
-   the `Mind Smith Dedication` daily has been updated
-   the module now allows you to create and use `Charges` spellcasting entries
    -   they work separately from the staves spellcasting entries
    -   you can set the max value for charges
    -   they behave the same way a regular spellcasting entry would
    -   also works on NPCs, which allows for pseudo-staff entries
-   the staves preparation has seen a complete change in its core:
    -   it no longer creates a spellcasting entry and spell items on the actor, it instead generates the entry during the actor `prepareData` like is done for wands & scrolls by the system
    -   the staff spellcasting entry can now be found at the top of the `Activations` tab
    -   a new `draw`, `retrieve` or `pick up` button is added if the staff isn't currently equipped
        -   a message is created when equipping the staff that way if in combat
    -   staff entries from an older module version will not be seen as staff entries anymore
        -   they will still appear in the sheet but won't be usable
        -   they will properly be removed during `rest` like everything else
    -   the `Staff Spellcasting Sort` setting has been removed
        -   the staves description still needs to respect the system's format
        -   the rank label needs to contain a number to be parsed, anything without a number will be seen as a `cantrip`
    -   staff spells above the `character level / 2` will not be added to the entry
    -   you can now expend spontaneous slots of higher ranks when casting a spell instead of the exact same rank
    -   you can provide a spontaneous entry id & rank in the `cast` method options of the staff entry to skip the dialog popup
-   custom dailies made prior to this version will not be compatible (though still accessible)
    -   the internal structure of dailies has been completely changed
    -   a lot of new features and utilities have been added/removed/modified
    -   it is now possible to have dailies that do not relate to an embedded item, `familiar` and `staves` dailies were previously hardcoded to bypass that restriction and are now made the same way any other daily
    -   removed templates but added convenient functions to create simple dailies with ease
    -   the `PF2e Dailies Ext` isn't usable anymore

# 2.24.0

-   this is a `5.14.0` release
-   updated the module to maintain compatibility with the latest system version
-   summary message has received a small restyle
-   empty prepared slots can now be expended during staff preparation
    -   the system doesn't have any visual cue to tell if an empty slot has been expended or not
    -   placing a spell later on in an expended slot will show the spell as expended properly
-   fixed expended prepared spells during staff preparation being completely removed instead

# 2.23.4

-   fixed language dailies not working with the latest system versions

# 2.23.3

-   prevent the daily preparation from crashing if a staff contains an UUID that leads to nothing
-   fixed issue during spell staff preparation in the unusual situation where more than one prepared spellcasting entry exist and none have any spell actually prepared

# 2.23.2

-   set a hard cap for the number of staff charges based on the actor level (this doesn't include expended spells)

# 2.23.1

-   fixed error with `ItemSpellcasting`

# 2.23.0

-   this is a `5.13.0` release
-   updated the different helpers changes made in the system
-   updated `Staff Nexus` to its remaster version, the makeshift staff now gets base charges like any staff and the feature adds extra expendable slots globaly (the staff `Type` field has been removed)
-   the system now adds rule elements to feats that let you train a skill (e.g. `Ageless Spirit`, `Ancestral Longevity`, etc.), because those directly conflict with the module, they will be removed from said feats the first time a daily preparation is done on them, this is an irreversible process
    -   if a player doesn't want to let the module handle one of those feat and prefers using the systems `Roll Options`, they are gonna have to add their key to the `Filter Out Dailies` setting
    -   if the rule elements have already been removed from the feats due to daily preparation, the feats will have to be replaced in the character sheet
-   added support for `Expert Longevity`
-   removed the droppable field spell category filters from `Tricster's Ace`, having 2 categories leaves the browser window empty

# 2.22.1

-   fixed `Advanced Alchemy` not adding items because of the module

# 2.22.0

-   added `Staff Labels Regex` world setting:
    -   offers support for different rank label formats, mostly useful for localized languages that modify the items description with babele
    -   must contain a regex summarizing the possible rank labels, any staff item not matching it will not be processed during daily preparation, so make sure to add all the eventual formats
    -   labels must contain numerical values for ranks (cantrip doesn't need it)
    -   can be left empty to use the default english labels:
        -   `cantrips?|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th`
-   updated `onPerformDailyCrafting` wrapper
-   fixed `SpellcastingEntryPF2e#cast` wrapper error spam

# 2.21.1

-   fixed rest-for-the-night button message when no dailies were prepared

# 2.21.0

-   this is a `5.12.3` release
-   the cup icon will now be disabled if the character has yet to rest
-   cleaning of dailies is now linked to the rest-for-the-night message instead of its hook
-   the rest-for-the-night system message will now contain an extra button:
    -   allows the preparation of dailies when clicking on it
    -   disabled if the associated character cannot prepare the dailies
    -   disabled if the module is currently cleaning the dailies on the associated character
-   removed the `requestDailies` api function
-   removed the `Watch For Request` setting

# 2.20.0

-   this is a `5.12.0` release
-   updated the spell and languages data changes from the system

# 2.19.0

-   added a `Filter Out Dailies` client setting
    -   list of comma separated Daily keys (i.e. 'dailies.tome', 'custom.mydaily') to be filtered out of the daily preparation for this user
    -   you can get the list of keys by typing in your browser console `game.modules.get('pf2e-dailies').api.getBuiltinDailyKeys()`
    -   you can also directly retrieve the key of a specific daily from any of its related item uuid by typing in your browser console `game.modules.get('pf2e-dailies').api.getBuiltinDailyKey('<compendium-uuid-of-the-item>')`
-   added support for flexible spellcasting entries to be expended during staves preparation
-   spells and flexible slots will now be grouped by spellcasting entry inside the staff `Expend Spell` selects
-   removed `anarchic` and `axiomatic` from `Advanced Runic Mind Smithing` selection
-   fixed rations not being used
-   fixed `Kinetic Activation` breaking stuff

# 2.18.0

-   changed empty fields warning and now indicate which ones by decorating their label
-   improved the way the best spellcasting entry the staff spellcasting entry will be based on is chosen
    -   it first looks at the ones with the highest DC, if only one is found, then we are done
    -   if only one has the same attribute than the character's main classDC, then it will be chosen
    -   it will then look at the one with the most "prepared" spells
    -   if it still ends up with a tie between multiple entries, the first of them will be picked
-   changed how rigid the `Root Magic` actor list is populated when the `Party Members Only` setting is enabled and the character isn't part of any party, if it is not part of a party, it will look at all the player owned actors
-   fixed sorting of staff spellcasting entry when using the `Top of the list` option not always being on top

# 2.17.0

-   removed `Items Only - All Magic Items` from the criterias used to determine if a character can use staves
-   added an exception for `Kinetic Activation` to determine if a character can use staves

# 2.16.0

-   added a `Staff Spellcasting Sort` setting to decide if the entry should be created at the top or bottom of the list
-   added a new `unique` option for selects to manage mutually exclusive options
    -   when more than one select in a group share the same `unique` data, any option already selected will not be available to the others
    -   this is useful for features like `Familiar Abilities` which will let the user select from the same list multiple times
-   added support for `Staff Nexus`, more prepared spells can be expended
-   fine-tuned the staff description parser to only catch the actual spells list and to be more lenient on the syntax
-   reproduce more faithfully the existing spellcasting entry data when creating the staff spellcasting entry
-   fixed heightened spells not using the right rank when expended for `Preparing a Staff`

# 2.15.4

-   fixed `@Compendium` syntax not being parsed in staves description

# 2.15.3

-   staff spellcasting entry spells will now be shown as expended when appropriate, taking into account possible use of spontaneous spell slots

# 2.15.2

-   fixed thaumaturge's `Tome` proficiencies not scaling properly with the adept and paragon feats

# 2.15.1

-   fixed codas not showing up in the selection list of staves for `Preparing a Staff`

# 2.15.0

-   this is a `5.10.5` release
-   added support for `Ceremonial Knife`
    -   the character needs to have an actual "knife" in their inventory
    -   nothing will happen to the "knife" weapon itself
    -   it will create a new `Ceremonial Knife` consumable (repurposed wand)
-   added support for `Preparing a Staff`
    -   it replaces the module `PF2e Staves`, you won't need to do anything to transition between the modules, any spellcasting entry that was created by `PF2e Staves` will work and be removed on the next long rest
    -   the character needs to be able to cast spells, the module uses `Items Only - All Magic Items`, `Prepared` and `Spontaneous` spellcasting entries to determine that
    -   the character will have the opportunity to expend a prepared spell to add extra charges during daily preparations
    -   the character will have the opportunity to expend a spontaneous spell slot while casting a spell from a staff
    -   the character needs to hold the staff to cast a spell from it

# 2.14.0

-   this is a `5.9.5` release
-   fixed `Experimental Spellshaping` using `spellshape` trait instead of `metamagic`
-   fixed not being able to open the compendium browser for spells with level filters
-   fixed not being able to drop a spell in a field that had a level filter
-   fixed spell scrolls creation (also added the spell traits and rarity to the scroll)

# 2.13.0

-   added german localization (thanks to [Tim Segger](https://github.com/timsegger))

# 2.12.3

-   traits manually selected for your `Mind Weapon` are no longer removed if you don't have the `Malleable Mental Forge` feat
-   you can now properly select two traits with the `Malleable Mental Forge` feats
-   the owning actor is now passed to the `rest` daily function

# 2.12.2

-   fixed lingering issues with system changes that were never reported
-   fixed underlying issue with how multiple updates on a single item could sometimes result in some not working

# 2.12.1

-   fixed `utils.skillNames` error (again)

# 2.12.0

-   the `Party Members Only` now look for all parties the character is a member of instead of just the active one, it will also pull all member actors from the party when enabled, while only player owned actors will be pulled from the world actors list when disabled
-   the module doesn't try to check for active dailies anymore before rendering the coffee cup icon in the character sheet
-   the daily interface will now display a message when no active dailies are available

# 2.11.0

-   added `Party Members Only` user setting, when a collection of players actors is retrieved in the module and if the character is a member of a party, should those actors only be pulled from said party or not
-   added support for the `Root Magic` feat (this will use the new `Party Members Only` setting), GMs will be warned if they have the `Root Magic` custom daily in their world (it can be deleted safely)
-   daily menu select fields will now be disabled if only one option is available
-   prevent `Blade Ally` from showing up if no weapon is available
-   exposed new (mostly for debugging) functions to the API
-   fixed `utils.skillNames` error

# 2.10.0

-   added support for `Blade Ally` (there is no more use for the system's `Effect: Blade Ally`)
    -   The Tenets of Good
    -   The Tenets of Evil
    -   Liberator
    -   Paladin
    -   Antipaladin
    -   Tyrant
    -   Radiant Blade Spirit
    -   Radiant Blade Master

# 2.9.3

-   fixed players being unable to drop items onto the preparations interface (how long as it been an issue ?)

# 2.9.2

-   fixed UUIDs that slipped through the crack in 2.9.0 and weren't converted to the v11 version

# 2.9.1

-   replaced root-level url to use relative path

# 2.9.0

-   converted all UUIDs to v11 version
-   v11 only

# 2.8.1

-   fixed rituals spellcasting entries breaking some lookups (slipped through from when the system changed rituals)

# 2.8.0

-   updated the familiar abilities for the system version `4.12.7`, which means that custom familiar abilities now need to be `Action`s and not `Effect`s anymore

# 2.7.3

-   fixed temporary feat parent check

# 2.7.2

-   fixed creating a temporary rule element on an item making all other rules eligible to delete on `rest`

# 2.7.1

-   just a typo

# 2.7.0

-   the module now exposes functions that can be used in macros or by other modules

```js
/**
 * Retrieves the API object containing the funtions
 */
game.modules.get("pf2e-dailies").api;
```

```js
/**
 * Opens the `Daily Preparations` interface for a character
 * if no actor parameter is provided, the module will look
 * for a valid character among the currently selected tokens
 * or get the default user's character if any.
 *
 * @param {CharacterPF2e} [actor]
 */
function openDailiesInterface(actor?: CharacterPF2e): void
```

```js
/**
 * This will create a chat message reminding all the users to do their
 * daily preparations, this requires for the setting `Watch For Request`
 * to be enabled, otherwise the chat card button will not be functional.
 */
function requestDailies(): void
```

# 2.6.0

-   updated for system version `4.10.0` feat filters

# 2.5.2

-   added chinese traditional localization option

# 2.5.1

-   updated french localization (thanks to [rectulo](https://github.com/rectulo))
-   added chinese localization (thanks to [LiyuNodream](https://github.com/LiyuNodream))

# 2.5.0

-   now prevents the system from deleting temporary items when using the `Complete Daily Crafting` action in the crafting tab

# 2.4.0

-   updated for system version `4.9.0` which changed the way compendium browser filters work

# 2.3.2

-   removal of russian localization because of conflicts

# 2.3.1

-   fixed an issue with firefox not allow drag & drop on `disabled` inputs
-   added `spin` animation for the process loader (it was thought to be but was actually added by another module)

# 2.3.0

-   added french localization (thanks to [rectulo](https://github.com/rectulo))
-   added russian localization (thanks to [DoctorDankovsky](https://github.com/DoctorDankovsky))

# 2.2.0

-   you can now register custom familiar abilities (add their UUIDs in settings)

# 2.1.0

-   dispose of monaco models directly instead of letting the extension do it (allowing for definition peeking using alt+F12)
-   check for extension version and notify the user if out-of-date

# 2.0.1

-   removed some debug stuff

# 2.0.0

-   module has been completely re-written (keep an eye out for bugs)
-   characters are now forced to `rest` before they can make daily preparations
-   message links for created items now point to the compendium entries instead of the actor items
-   now displays resistance value in message
-   now displays spell level in message
-   now links directly to the spell instead of the scroll in the message (still shows the name of the scroll)
-   the module now offers full support for homebrew dailies

# 1.19.0

-   added support for ration consumption (the default option will always revert to "not consume" instead of being saved)

# 1.18.1

-   fix search traits stacking bug

# 1.18.0

-   fix bug with browser search level
-   added the feat `Metamagical Experimentation`

# 1.17.0

-   added support for familiar abilities

# 1.16.0

-   now has an alert field, which will display what is wrong and offer a way to fix it (by clicking on the alert triangle)
-   added full support for `Mind Smith Dedication` (only the parts that are dailies)

# 1.15.0

-   fix bug with drop fields not saving
-   fix issue with the processing logo and the cover sizes
-   now has a combo field which allow to select options from a dropdown or manual inputs
-   options that let you select a skill now use the combo field, allowing you to either select a skill from the dropdown or enter the name of a lore

# 1.14.0

-   now supports randomly picking options when necessary
-   the `Ganzi Heritage` has been switched to be random

# 1.13.0

-   added the feat `Trickster's Ace` (there is no way to force the self target condition, players will have to do it manually)

# 1.12.2

-   fix debug mistake

# 1.12.1

-   now shows a loader during processing

# 1.12.0

-   added the `Thaumaturgy Tome` (all conditions are supported)

# 1.11.0

-   added the `Ganzi Heritage`

# 1.10.0

-   added the `Elementalist Dedication`

# 1.9.1

-   fixed typos
-   fixed disabling the interface not working
-   changed regular and disabled colors to use foundry variables
-   no longer minimize class names during compiling

# 1.9.0

-   added the loremaster feat `Quick Study`

# 1.8.0

-   added the wizard feat `Scroll Savant` (all conditions are supported)

# 1.7.1

-   slight optimization of the `rest` reset (every bit matters since it is async)

# 1.7.0

-   now support feats (as in you can drop feats in the interface)
-   added the fighter feat `Combat Flexibility`

# 1.6.0

-   the `daily preparations` interface has been re-designed, resulting in something much cleaner
-   module has been completely refactored

# 1.5.0

-   now support items
-   now support languages
-   added the item `Bort's Blessing`
-   added the feat `Ancestral Linguistics`

An item needs to be invested to appear in the interface, the bonus provided is linked to the item itself and like any other bonuses, will be removed if the character un-invest or un-equip the item.

NOTE: Don't be alarmed the next time you are doing your daily preparations if the spells selected in the `Scroll Esoterica` section are gone, the category name has been changed internally.

IMPORTANT: It is possible that opening the interface too quickly after a `rest` result in the reset not being completed yet and the details shown not up to date.

# 1.4.0

-   Feats that require you to select an options (like a skill or a language) will now be reset on `rest`
-   added the feat `Ageless Spirit`
-   added the feat `Ancient Memories`
-   added the feat `Flexible Studies`

Selected skills are ranked to `Trained`

IMPORTANT: You should always `rest` before your daily preparations, if not, you will most likely encounter some problems.

# 1.3.0

-   added the feat `Ancestral Longevity` (The selected skill will automatically be ranked to `Trained`)
-   now requires all fields to be filled

# 1.2.0

-   no longer takes charge of talismans (the system is already doing it)
-   now uses the system's temporary items
    -   no longer remove or check for items existence
    -   removed warning message

# 1.1.0

-   added a warning message when trading a temporary item

# 1.0.0

-   original release
