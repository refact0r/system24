
<img src="https://github.com/refact0r/system24/raw/main/assets/preview.png">

# system24

a customizable, tui-style discord theme. inspired by [spicetify text theme](https://github.com/spicetify/spicetify-themes/tree/master/text).

<img src="https://github.com/refact0r/system24/raw/main/assets/screenshot.png">

## discord server

need help? want to get notified about updates? have feedback? join <https://discord.gg/nz87hXyvcy>

## install

### vencord/betterdiscord (or any client that supports theme files)

1. download the theme file, [`system24.theme.css`](https://github.com/refact0r/system24/blob/main/theme/system24.theme.css). (there should be a download button at the top right of the page)
2. drag the file into your theme folder. (there should be a button to open the theme folder in theme settings)
3. (optional) customize the theme by editing the options in `system24.theme.css`.

### install through link

add `https://refact0r.github.io/system24/build/system24.css` to your theme import links. you will need to copy the theme variables to your quickcss in order to customize the theme.

## flavors

customized variants of the theme.

- [catppuccin mocha](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-catppuccin-mocha.theme.css)
- [catppuccin macchiato](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-catppuccin-macchiato.theme.css)
- [everforest](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-everforest.theme.css)
- [rosé pine](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-rose-pine.theme.css)
- [rose pine moon](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-rose-pine-moon.theme.css)
- [tokyo night](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-tokyo-night.theme.css)
- [nord](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-nord.theme.css)
- [vencord](https://github.com/refact0r/system24/blob/main/theme/flavors/system24-vencord.theme.css)

## contributing

this theme depends on [midnight](https://github.com/refact0r/midnight-discord) for its core styles. if you're looking to contribute, please consider which theme you actually want to work on. feel free to open an issue and ask if you're unsure.

this theme uses a dev script to check for changes in the source css files and combine them into a build file. to run locally:

1. clone the repository.
2. run `npm i`.
3. create a `.env` file in the project root with the paths of any local theme files you want to update (comma separated)

```
DEV_OUTPUT_PATH=C:\Users\USERNAME\AppData\Roaming\Vencord\themes\system24-dev.theme.css
```

4. run `npm run dev`.
5. make changes to any file in `/src` or the main theme file. the local theme files you listed will automatically be updated, along with the build file in `/build`.
6. make a pull request with your changes!

## credits

[spicetify text theme](https://github.com/spicetify/spicetify-themes/tree/master/text) for primary design inspiration.

thanks to all the [contributors](https://github.com/refact0r/system24/graphs/contributors)!
