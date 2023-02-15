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
