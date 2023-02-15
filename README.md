# FoundryVTT PF2e Dailies

This module will provide a convenient interface to handle a character's daily preparations if they have at least one of the following feats or items:

Familiar Abilities

-   If the character has a familiar, the module will offer the ability to select its abilities.

Language related

-   [Ancestral Linguistics](https://2e.aonprd.com/Feats.aspx?ID=1407)
-   [Bort's Blessing](https://2e.aonprd.com/Equipment.aspx?ID=476)

Skill related

-   [Ancestral Longevity](https://2e.aonprd.com/Feats.aspx?ID=12)
-   [Ageless Spirit](https://2e.aonprd.com/Feats.aspx?ID=2393)
-   [Ancient Memories](https://2e.aonprd.com/Feats.aspx?ID=3944)
-   [Flexible Studies](https://2e.aonprd.com/Feats.aspx?ID=1446)
-   [Quick Study](https://2e.aonprd.com/Feats.aspx?ID=2003)
-   [Thaumaturgy Tome](https://2e.aonprd.com/Implements.aspx?ID=7)

Resistance related

-   [Elementalist Dedication](https://2e.aonprd.com/Feats.aspx?ID=2986)
-   [Ganzi Heritage](https://2e.aonprd.com/Heritages.aspx?ID=129)

Feat related

-   [Combat Flexibility](https://2e.aonprd.com/Classes.aspx?ID=7)
    -   [Improved Flexibility](https://2e.aonprd.com/Classes.aspx?ID=7)
-   [Metamagical Experimentation](https://2e.aonprd.com/ArcaneThesis.aspx?ID=2)

Spell related

-   [Trickster's Ace](https://2e.aonprd.com/Feats.aspx?ID=598)

Scroll related

-   [Basic Scroll Cache](https://2e.aonprd.com/Feats.aspx?ID=2054)
    -   [Expert Scroll Cache](https://2e.aonprd.com/Feats.aspx?ID=2056)
    -   [Master Scroll Cache](https://2e.aonprd.com/Feats.aspx?ID=2057)
-   [Scroll Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3713)
    -   [Elaborate Scroll Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3720)
    -   [Grand Scroll Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3730)
-   [Scroll Savant](https://2e.aonprd.com/Feats.aspx?ID=652)

Mind Smith Dedication

-   [Mind Smith](https://2e.aonprd.com/Archetypes.aspx?ID=194)
    -   [Malleable Mental Forge](https://2e.aonprd.com/Feats.aspx?ID=3868)
    -   [Runic Mind Smithing](https://2e.aonprd.com/Feats.aspx?ID=3870)
    -   [Advanced Runic Mind-Smithing](https://2e.aonprd.com/Feats.aspx?ID=3872)

IMPORTANT: You should always `rest` before your daily preparations, if not, you will most likely encounter some problems. It is also possible that openning the interface too quickly after a `rest` result in the reset not being completed yet and the details shown not up to date.

# Sheet Icon

![](./readme/icon.webp)

A new character sheet icon will appear next to the `rest` one, clicking on it will open the daily preparations interface.

# Interface

![](./readme/interface.webp)

The interface will look different depending on the feats and items present on the character and its current level.

The interface allows the user to open the compendium browser (with the right settings) and directly drag & drop the appropriate items.

## Scrolls

When a spell is dropped in a spell slot, a temporary spell scroll will be created with the appropriate hightened level directly in the character's inventory.

## Spells

When needed, a spellcasting entry will be added to house the added spells.

## Feats

![](./readme/feats.webp)

Selected feats are directly added to the character feat tab, in cascade with the related feat that gave the user the choice.

## Equipment

Equipment items need to be invested to appear in the interface, the bonus provided is linked to the item itself and like any other bonuses, will be removed if the character un-invest or un-equip the item.

# Alert Field

![](./readme/alert.webp)

When there is a problem with any part of data gathering (like the `Mind Weapon` missing), the alert field will be displayed in place of a regular option one, it will have a succinct description of the issue and offer a way to resolve it by clicking on the alert triangle.

This is not to be mistaken with an error message, this is used to offer the user a way to interract beyond the interface window, like automatically creating your `Mind Weapon`.

# Combo Field

Sometimes, you should have the option to either select an option from a defined list AND have the opportunity to manually enter some value, for instance with skills which when offered the choice of selecting one, allows for the selection of a lore skill.

![](./readme/combo.webp)

In those cases, the combo field will be used, allowing you to select an options from the dropdown but also to manually type in the input field.

# Random

The module will randomly pick an option when necessary.

![](./readme/random.webp)

_An animated die will rotate in the interface window to point out which options are randomly picked, the different options will also loop over inside the field._

![](./readme/random-chat.webp)

_A die is added to the chat message to accentuate which options were randomly chosen._

# Chat

![](./readme/chat.webp)

A descriptive chat message will be created to indicate what has been prepared.

# Rest

Feats and items that require you to select an options (e.g. skill or language) will be reset on `rest`.

# CHANGELOG

You can see the changelog [HERE](./CHANGELOG.md)
