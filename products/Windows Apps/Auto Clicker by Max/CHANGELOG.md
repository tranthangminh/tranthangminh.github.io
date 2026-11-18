# Changelog

## Unreleased

### Fixed
- With Free Mouse, a game window behind other windows did not react to clicks. The window is now told it is active and the pointer hovers the spot before the press, without changing the window in front.
- With Free Mouse, Chrome and Edge brought the clicked window to the front on every click. The window you work in is put back, unless you switched on purpose (Alt, Win, or a click elsewhere).
- With Free Mouse, Drag, Scroll, Key Press, Type Text and Press & Click still used the real mouse and keyboard. They now go to the step's window in the background. Keys need a step bound to a window; with All Screens they still go to the window in front.
- A tab started with the real mouse kept using it after a second tab started. Both now click in the background.

## 1.1.4

### Added
- Warn when another app already holds F6 or F7.
- Keep a `.bak` of the settings, and write unexpected errors to `error.log`.
- Vietnamese text for the color picker, Move & Scale, file messages and the image menu.
- New popup frame for messages and dialogs.

### Changed
- App icon rebuilt from the vector logo, with 16, 32, 48 and 256 px sizes.
- The hotkey guide at the bottom of Simple and Asian Mode now matches the other cards.
- Only open update links on `https://tranthangminh.github.io`.

### Fixed
- Settings were overwritten after a failed read. A damaged file is now kept as `.corrupt-*` and restored from `.bak`.
- Very fast scripts could freeze the window and block F7.
- A script error could close the app. It now stops that tab, releases the keys and mouse, and shows a message.
- Out-of-range values in a script file are limited when the file is read.
- A window title containing `&` showed the wrong text in target menus.
