# Stage 3.1 — Gallery lightbox repair

This patch fixes the gallery viewer opening to a blank screen, including the percentage-height sizing issue that can occur in Safari.

## Install

Copy the `src` folder from this patch into the root of your existing `brettsflowart-website` repository.
Allow VS Code to merge folders and replace these files:

- `src/components/GalleryCard.astro`
- `src/components/GalleryLightbox.astro`
- `src/styles/global.css`

## Test

```bash
npm run build
npm run preview
```

Open the gallery, click several portrait and landscape thumbnails, and test the previous/next buttons.

Also verify that the full-size files are present in:

```text
public/images/gallery/full/
```

If a full-size image cannot be loaded, the repaired lightbox automatically falls back to the thumbnail and displays an error message only if both files fail.

## Commit

```bash
git add .
git commit -m "Fix gallery lightbox image display"
git push origin main
```
