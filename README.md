# Achtung!

This fork, compared to the original repo, implemented 2 new features

1. Linux notifications + sound (at least on wayland + pipewire)
2. App starts in the system tray and go back to the system tray when the window is closed.

The reason why I didn't open a PR is because these feature were added using AI.
I don't know anything and I don't care about JavaScript, I just wanted a decent calendar app for Linux.

Also I didn't test this on any other configuration, I may have broken something, I don't know, but if you are using Wayland and pipewire, this should work

To install my fork on Arch

```bash
paru -G notion-calendar-electron
cd notion-calendar-electron
sed -i "s|czlabinger|pviscone|g" ./PKGBUILD
sed -i "s|1.0.4|1.0.5|g" ./PKGBUILD
makepkg -si
```

---

# Notion Calendar Electron

A simple Electron-based Notion Calendar client

<div align="center">

![](https://img.shields.io/github/last-commit/czlabinger/notion-calendar-electron?&style=for-the-badge&color=FFB1C8&logoColor=D9E0EE&labelColor=292324)
![](https://img.shields.io/github/stars/czlabinger/notion-calendar-electron?style=for-the-badge&logo=andela&color=FFB686&logoColor=D9E0EE&labelColor=292324)
![](https://img.shields.io/github/repo-size/czlabinger/notion-calendar-electron?color=CAC992&label=SIZE&logo=googledrive&style=for-the-badge&logoColor=D9E0EE&labelColor=292324)
![](https://img.shields.io/badge/issues-skill-green?style=for-the-badge&color=CCE8E9&logoColor=D9E0EE&labelColor=292324)

</div>

## Installation

### Arch

From [AUR](https://aur.archlinux.org/packages/notion-calendar-electron)

#### yay
```bash
yay -S notion-calendar-electron
```

#### paru
```bash
paru -S notion-calendar-electron
```

### NixOS
#### Using Flakes
Add Notion Calendar Electron to your flakes inputs:
```nix
inputs.notion-calendar-electron.url = "github:czlabinger/notion-calendar-electron";
```

Install it:
```nix
environment.systemPackages = with pkgs; [
  inputs.notion-calendar-electron.packages.${pkgs.system}.default
];
```
