# Achtung!

This fork, compared to the original repo, implemented 2 new features

1. Linux notifications + sound (at least on wayland + pipewire)
2. App starts in the system tray and go back to the system tray when the window
   is closed.

The reason why I didn't open a PR is because these feature were added using AI.
I don't know anything and I don't care about JavaScript, I just wanted a decent
calendar app for Linux.

Also I didn't test this on any other configuration, I may have broken something,
I don't know, but if you are using Wayland and pipewire, this should work

To install my fork on Arch

```bash
makepkg -si
```
