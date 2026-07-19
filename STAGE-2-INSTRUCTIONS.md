# Brett's Flow Art — Stage 2 homepage

This package replaces the Astro starter homepage with the first production homepage.

## Install

1. Extract this ZIP.
2. Copy its contents into the root of your local `brettsflowart-website` repository.
3. Allow VS Code to merge folders and replace `astro.config.mjs` and `src/pages/index.astro`.
4. In the VS Code terminal, run:

```bash
npm uninstall @astrojs/cloudflare
npm install
npm run dev
```

If npm says `@astrojs/cloudflare` is not installed, continue normally.

Open the local address printed by Astro, normally `http://localhost:4321`.

## Production check

Stop the development server with `Ctrl+C`, then run:

```bash
npm run build
npm run preview
```

## Commit

```bash
git add .
git commit -m "Build Stage 2 artist homepage"
git push origin main
```

## Placeholder files to replace later

- `public/images/portrait-placeholder.svg`
- `public/images/logo-placeholder.svg`
- `public/images/favicon-placeholder.svg`
- `public/images/placeholders/artwork-4.svg` through `artwork-8.svg`

The social media and Etsy destinations are also placeholders.
