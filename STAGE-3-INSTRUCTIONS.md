# Brett's Flow Art — Stage 3 Gallery

This package adds a data-driven gallery and individual artwork pages to the completed Stage 2 project.

## Catalogue count

The uploaded archive contained **78 image files**. Four pairs were byte-for-byte duplicates, so this build publishes **74 unique gallery entries** rather than showing the same photographs twice.

Duplicate pairs:

- `art1.JPG` = `ART1839.JPG`
- `art2.JPG` = `ART1840.JPG`
- `art3.jpeg` = `ART1884.jpeg`
- `Stool.JPG` = `ART1838.JPG`

## Install

1. Extract this ZIP.
2. Copy everything inside the `brettsflowart-stage3` folder into the root of your existing `brettsflowart-website` repository.
3. Allow VS Code to merge folders and replace existing files when prompted.
4. Run:

```bash
npm install
npm run dev
```

Visit `http://localhost:4321/gallery/`.

## Production test

```bash
npm run build
npm run preview
```

## Commit

```bash
git add .
git commit -m "Build Stage 3 artwork gallery"
git push origin main
```

## Editing artwork details

All gallery metadata is stored in:

`src/data/artworks.ts`

Each entry has editable fields for title, medium, dimensions, availability, price and description. The current values are deliberately conservative placeholders where information was not supplied.

## Included features

- 74 unique optimised artwork images
- Dedicated `/gallery/` page
- Filtering and catalogue search
- Progressive “show more” loading
- Full-screen keyboard-accessible lightbox
- One static detail page per work
- Previous/next artwork navigation
- Email enquiry links with the artwork catalogue number
- Updated homepage featured gallery
- Updated navigation, footer and XML sitemap
