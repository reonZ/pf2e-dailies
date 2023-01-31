# FoundryVTT PF2e Dailies

This module will provide a convenient interface to handle a character's daily preparations if they have at least one of the following feats and create/delete the associated items:

-   [Scroll Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3713)
    -   [Elaborate Scroll Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3720)
    -   [Grand Scroll Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3730)
-   [Basic Scroll Cache](https://2e.aonprd.com/Feats.aspx?ID=2054)
    -   [Expert Scroll Cache](https://2e.aonprd.com/Feats.aspx?ID=2056)
    -   [Master Scroll Cache](https://2e.aonprd.com/Feats.aspx?ID=2057)
-   [Talisman Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3706)
    -   [Elaborate Talisman Esoterica](https://2e.aonprd.com/Feats.aspx?ID=3716)
-   [Talisman Dabbler Dedication](https://2e.aonprd.com/Feats.aspx?ID=2079)
    -   [Deeper Dabbler](https://2e.aonprd.com/Feats.aspx?ID=2081)

# Sheet Icon

![](./readme/icon.webp)

A new character sheet icon will appear next the to `rest` one, clicking on it will open the daily preparations interface.

# Interface

![](./readme/interface.webp)

The interface will look different depending on the feats present on the character and its current level.

The interface allows the user to open the compendium browser (with the right settings) and directly drag & drop the appropriate items.

Whenever a change is made in the interface:

-   If an item has been removed and is still currently existing on the character, it will automatically be deleted.
-   If no change has been made but the item is no longer present on the character, the item will be re-created.

## Scrolls

When a spell is dropped in a spell slot, a new spell scroll will be created with the appropriate hightened level directly in the character's inventory.

To make it easier to remember which scrolls are temporary, they will have the suffixes `**` added to their name.

## Talismans

When a talisman is dropped in a talisman slot, it will automatically be added to the character's inventory.

To make it easier to remember which talismans are temporary, they will have the suffixes `**` added to their name.

# Chat

![](./readme/chat.webp)

A descriptive chat message will be created to indicate what has changed during the daily preparations.

Because deleted items have been ... deleted, there is no existing link to them, therefore the "link" boxes in that section are not actually clickable.

Only actual changes on the character will be notified in the chat message, if nothing was changed in the interface but items have been re-created for instance, those will be notified.

# CHANGELOG

You can see the changelog [HERE](./CHANGELOG.md)
