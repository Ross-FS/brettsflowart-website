# Stage 3.2 — Homepage hero image repair

This patch makes the hero artwork a direct static file and removes negative z-index stacking from the hero. It retains the Stage 3.1 gallery lightbox repair.

## Install

1. Extract this ZIP.
2. Copy everything inside `brettsflowart-stage3.2-homepage-image-fix` into the root of your existing `brettsflowart-website` project.
3. Allow VS Code to merge folders and replace these files:
   - `src/components/Hero.astro`
   - `src/styles/global.css`
4. Confirm this file was added:
   - `public/images/header.jpeg`

## Test

```bash
npm run build
npm run preview
```

Open the preview address and confirm the homepage hero artwork is visible.

You can also test the image directly by opening:

```text
http://localhost:4321/images/header.jpeg
```

## Commit and deploy

```bash
git add .
git commit -m "Fix homepage hero image on Cloudflare Pages"
git pull --rebase origin main
git push origin main
```

If the rebase reports conflicts, resolve them before pushing. Do not force-push.
