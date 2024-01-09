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
game.modules.get('pf2e-dailies').api
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
