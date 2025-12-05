#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const root = process.cwd();
const docsDir = root;
const outBase = path.join(root, 'build');
const target = process.argv[2] || 'public';
const outDir = path.join(outBase, target);

function toRoute(file) {
  const rel = path.relative(docsDir, file);
  return rel.replace(/\\/g, '/').replace(/\.mdx$/, '');
}

async function findMdxFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'build'].includes(entry.name)) continue;
      files = files.concat(await findMdxFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(full);
    }
  }
  return files;
}

function isInternal(frontmatter) {
  return frontmatter.internal === true || frontmatter.visibility === 'internal';
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyFolder(folder) {
  const srcDir = path.join(docsDir, folder);
  try {
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const src = path.join(srcDir, entry.name);
      const dest = path.join(outDir, folder, entry.name);
      if (entry.isDirectory()) {
        await copyFolder(path.join(folder, entry.name));
      } else if (entry.isFile()) {
        await copyFile(src, dest);
      }
    }
  } catch (err) {
    // Folder missing: skip silently
  }
}

async function run() {
  console.log(`Building filtered docs to ${outDir} (target: ${target})`);
  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);

  const mdxFiles = await findMdxFiles(docsDir);
  const allowed = new Set();

  for (const file of mdxFiles) {
    const raw = await fs.readFile(file, 'utf8');
    const fm = matter(raw).data || {};
    if (isInternal(fm)) continue;
    allowed.add(toRoute(file));
    const dest = path.join(outDir, path.relative(docsDir, file));
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, raw, 'utf8');
  }

  // Filter docs.json navigation to allowed pages
  const docsJsonPath = path.join(docsDir, 'docs.json');
  const docsJsonRaw = await fs.readFile(docsJsonPath, 'utf8');
  const docsJson = JSON.parse(docsJsonRaw);

  function filterPages(pages) {
    return pages.filter((p) => allowed.has(p));
  }

  if (docsJson.navigation && docsJson.navigation.tabs) {
    docsJson.navigation.tabs = docsJson.navigation.tabs
      .map((tab) => {
        const groups = (tab.groups || []).map((group) => {
          const filteredPages = group.pages ? filterPages(group.pages) : [];
          return { ...group, pages: filteredPages };
        }).filter((g) => g.pages && g.pages.length);
        return { ...tab, groups };
      })
      .filter((t) => t.groups && t.groups.length);
  }

  await fs.writeFile(path.join(outDir, 'docs.json'), JSON.stringify(docsJson, null, 2));

  // Copy shared assets
  for (const folder of ['images', 'logo', 'snippets']) {
    await copyFolder(folder);
  }
  for (const file of ['favicon.svg', 'styles.css']) {
    const src = path.join(docsDir, file);
    try {
      await copyFile(src, path.join(outDir, file));
    } catch (err) {
      // ignore missing optional assets
    }
  }
  // Copy OpenAPI spec if present
  const openapiSrc = path.join(docsDir, 'api-reference', 'openapi.json');
  try {
    await copyFile(openapiSrc, path.join(outDir, 'api-reference', 'openapi.json'));
  } catch (err) {
    // optional
  }

  console.log('Filtered build complete');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
