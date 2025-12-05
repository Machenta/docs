# Repository docs (K12 Safety)

This repo contains the Mintlify documentation site for the project (the docs/ folder is its own repo) using the standard Mintlify dev flow.

## Prerequisites
- Node 20+
- `npm install` (run in this folder) to get local dependencies
- Optional: Mintlify CLI (`npm i -g mint`) for live preview

## Local preview
- Run `npm run docs:dev` from this folder (where `docs.json` lives); this runs `mint dev`.
- Preview opens at `http://localhost:3000` (or the next open port).
### Preview filtered/public bundle
- Generate the public bundle (excludes `internal: true` or `visibility: "internal"` pages):

```pwsh
npm run docs:build:public
```

- Start Mintlify dev server against the filtered site (useful to preview real rendering):

```pwsh
npm run preview:public
```

- Alternatively, if you only want to serve files statically (note: MDX won't be rendered to HTML this way), run:

```pwsh
npm run preview:public:static
```
	This serves files from `build/public/` using a simple static server on port 8080.

## Filtered builds (exclude internal docs)
- Mark internal pages by adding `internal: true` or `visibility: "internal"` to their frontmatter.
- Build a public bundle that excludes those pages:

```pwsh
npm run docs:build:public
```

The filtered site is emitted to `build/public/` with navigation automatically pruned to allowed pages.

### Automated production workflow
We added a GitHub Action that builds `build/public` and publishes it to the `production` branch. When Mintlify is configured to build the `production` branch, the site it hosts will only contain pages without `internal: true`.

If you want to enable: Protect the `production` branch and require the CI action to prevent accidental exposure; add the additional validation described below.

## Production
- Mintlify does not expose a separate local "production server" command. Push your docs to the Mintlify-managed hosting or your deployment pipeline; use `mint dev` locally for preview.

## Project structure
- `docs.json` — navigation, theme, branding
- `index.mdx`, `quickstart.mdx`, `development.mdx` — core guides
- `essentials/`, `api-reference/` — topical content
- `snippets/` — reusable MDX snippets imported with root paths like `/snippets/snippet-intro.mdx`
- `scripts/build-filtered-docs.mjs` — optional filter build that drops `internal` pages and copies assets

## Authoring guidelines
- Use Mintlify MDX components (Accordions, Steps, Tabs, CodeGroup, Tip/Warning/Note) and keep headings descriptive.
- Write in second person, active voice; keep paragraphs short and scannable.
- Use `/snippets/...` absolute imports for snippets and images to avoid build warnings.

## Troubleshooting
- If pages 404 or nav warns: ensure the file path exists and is listed in `docs.json` (and included for the target audience).
- If snippet imports fail: confirm the file is in `snippets/` and the import path starts with `/snippets/`.
- Update the Mintlify CLI if preview misbehaves: `mint update`.

## Resources
- Mintlify docs: https://mintlify.com/docs
- Quickstart reference: https://starter.mintlify.com/quickstart
