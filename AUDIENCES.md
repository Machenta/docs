Audience-specific docs builds
===========================

This repository supports generating filtered documentation outputs for different audiences (e.g., `dev`, `pm`). The build script reads each MDX file's frontmatter `audience` field and includes only the files that match the requested audience.

Usage
-----

1. From the `docs/` folder, install dependencies (if you have not already):
```bash
npm install
```
2. Build docs for a particular audience:
```powershell
# Project manager version
npm run build:docs:pm

# Developer version
npm run build:docs:dev
```
4. Serve the generated output locally for testing:

```powershell
# With Mintlify (renders MDX/Docs):
cd docs/build/pm
npx mint dev

# Or use the npm script from the docs root:
cd docs
npm run preview:pm

# Fallback: static file server (won't execute MDX; shows raw files):
npm run preview:pm:local
```
3. The generated output will be available in `docs/build/<audience>` and contains a filtered `docs.json` (navigation) and the site pages (MDX) for your target audience.

Notes
-----
- Files without an `audience` frontmatter key are included in all builds.
- To make a page available only to a single audience, add frontmatter like:
```
---
title: "Your page"
audience: ["dev"]
---
```
- For fine-grained per-section control inside an MDX page, consider wrapping content in conditional components or splitting into separate pages so the build script can include or exclude them.

Extending the build
-------------------
- The script is intentionally minimal: it copies assets and filters the `docs.json` navigation based on included pages. If you use additional tooling (for a full static site build, bundler, or preview), you can point that system's build input to the `build/<audience>` folder.

Security & distribution
-----------------------
- The generated `build/<audience>` folder is safe to publish to a specific audience host or a limited access site. For public websites, ensure you don't leak sensitive or internal-only documentation on the public site.
