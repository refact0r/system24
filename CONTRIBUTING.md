# contributing

this theme depends on [midnight](https://github.com/refact0r/midnight-discord) for its core styles. if you're looking to contribute, please consider which theme you actually want to work on. feel free to open an issue and ask if you're unsure.

this theme uses a dev script to check for changes in the /src .css files and combine them into a build file in /build. note that both the /src files and the /build file are tracked in git, so any changes you contribute should exist in both places!!

to run locally:

1. clone the repository.
2. run `npm i`.
3. create a `.env` file in the project root with the paths of any local theme files you want to update (comma separated)

```
DEV_OUTPUT_PATH=C:\Users\USERNAME\AppData\Roaming\Vencord\themes\system24-dev.theme.css
```

4. run `npm run dev`.
5. make changes to any file in `/src` or the main theme file. the local theme files you listed will automatically be updated, along with the build file in `/build`.
6. make a pull request with your changes!
