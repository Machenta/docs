# Repository docs (Mintlify)

This repo contains the Mintlify documentation site for the project (the docs/ folder is its own repo). It includes audience-specific builds for PMs vs developers and ships with Mintlify components and MDX content.

## Prerequisites
- Node 20+
- `npm install` (run in this folder) to get local dependencies
- Optional: Mintlify CLI (`npm i -g mint`) for live preview

## Local preview
- Run `mint dev` from this folder (where `docs.json` lives).
- Preview opens at `http://localhost:3000`.

## Audience-specific builds
- PM build: `npm run build:docs:pm`
- Dev build: `npm run build:docs:dev`
- Builds go to `./build/pm` and `./build/dev` and filter pages + inline `<audience data-audience="pm|dev">` blocks via `scripts/generate-audience-docs.mjs`.

## Project structure
- `docs.json` — navigation, theme, branding
- `index.mdx`, `quickstart.mdx`, `development.mdx` — core guides
- `essentials/`, `ai-tools/`, `api-reference/` — topical content
- `snippets/` — reusable MDX snippets imported with root paths like `/snippets/snippet-intro.mdx`
- `scripts/generate-audience-docs.mjs` — audience filter and asset copy helper

## Authoring guidelines
- Use Mintlify MDX components (Accordions, Steps, Tabs, CodeGroup, Tip/Warning/Note) and keep headings descriptive.
- Write in second person, active voice; keep paragraphs short and scannable.
- Use `/snippets/...` absolute imports for snippets and images to avoid build warnings.
- Wrap audience-specific text in `<audience data-audience="dev">...</audience>` or `data-audience="pm"`.

## Troubleshooting
- If pages 404 or nav warns: ensure the file path exists and is listed in `docs.json` (and included for the target audience).
- If snippet imports fail: confirm the file is in `snippets/` and the import path starts with `/snippets/`.
- Update the Mintlify CLI if preview misbehaves: `mint update`.

## Resources
- Mintlify docs: https://mintlify.com/docs
- Quickstart reference: https://starter.mintlify.com/quickstart
