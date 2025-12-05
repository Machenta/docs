#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
// Minimal frontmatter parser that doesn't require external packages
function parseFrontmatter(raw) {
  const front = raw.startsWith('---') ? raw.split('---')[1] : '';
  const lines = front.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const out = {};
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    // Normalize arrays like ["dev","pm"] or [dev, pm]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      const items = inner.length === 0 ? [] : inner.split(',').map(s => s.trim().replace(/^['\"]|['\"]$/g, ''));
      out[key] = items;
    } else {
      // Remove quotes
      value = value.replace(/^['\"]|['\"]$/g, '');
      out[key] = value;
    }
  }
  return out;
}

const root = process.cwd();
const docsDir = path.join(root);
const outDir = path.join(root, 'build');
const targetAudience = process.argv[2] || process.env.AUDIENCE || 'dev';

async function readDocsJson() {
  const file = path.join(docsDir, 'docs.json');
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
}

async function findMdxFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(await findMdxFiles(full));
    else if (e.isFile() && e.name.endsWith('.mdx')) files.push(full);
  }
  return files;
}

function toRoute(file) {
  const rel = path.relative(docsDir, file);
  return rel.replace(/\\/g, '/').replace(/\.mdx$/, '');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

function rewriteAbsoluteImports(content, srcFileRel) {
  // Replace imports like: import X from '/snippets/..' with relative path
  // Keep '/snippets' and '/images' as absolute imports (Mintlify expects root path) and do not rewrite them.
  return content.replace(/(import\s+[\s\S]+?from\s+['"])(\/[^'"\n]+)(['"])/g, (m, p1, p2, p3) => {
    if (p2.startsWith('/snippets') || p2.startsWith('/images') || p2.startsWith('/logo') || p2.startsWith('/api-reference')) {
      return p1 + p2 + p3; // keep absolute root-style imports intact
    }
    const target = p2.slice(1); // drop leading slash
    const relative = path.relative(path.dirname(srcFileRel), target).replace(/\\/g, '/');
    const relPath = relative.startsWith('.') ? relative : './' + relative;
    return p1 + relPath + p3;
  });
}

function filterAudienceBlocks(content, targetAudience) {
  // Replace blocks like <audience data-audience="dev"> ... </audience>
  return content.replace(/<audience\s+data-audience\s*=\s*\"([a-z,\s]+)\"\s*>(([\s\S]*?))<\/audience>/gi, (m, aud, inner) => {
    const allowed = aud.split(',').map(a => a.trim());
    if (allowed.includes(targetAudience)) return inner;
    return '';
  });
}

async function run() {
  console.log(`Generating audience-specific docs for '${targetAudience}'`);
  const mdxFiles = await findMdxFiles(docsDir);
  const allowed = new Set();
  for (const f of mdxFiles) {
    // skip README and package.json etc
    if (f.includes('build') || f.includes('node_modules')) continue;
    const raw = await fs.readFile(f, 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm.audience || fm.audience.length === 0 || (Array.isArray(fm.audience) && fm.audience.includes(targetAudience))) {
      allowed.add(toRoute(f));
    }
  }

  // Build output dir
  const out = path.join(outDir, targetAudience);
  await fs.rm(out, { recursive: true, force: true });
  await ensureDir(out);

  // Copy allowed MDX files and assets
  for (const f of mdxFiles) {
    const route = toRoute(f);
    if (allowed.has(route)) {
      const destRel = path.relative(docsDir, f);
      const dest = path.join(out, destRel);
      await ensureDir(path.dirname(dest));
      let raw = await fs.readFile(f, 'utf-8');
      // rewrite absolute imports like /snippets/... to relative paths
      raw = rewriteAbsoluteImports(raw, destRel);
      // remove any inline audience blocks that don't match the target
      raw = filterAudienceBlocks(raw, targetAudience);
      await fs.writeFile(dest, raw);
    }
  }

  // Filter docs.json navigation
  const docsJson = await readDocsJson();
  function filterPages(pages) {
    return pages.filter((p) => {
      // already allowed? check if file exists
      return allowed.has(p);
    });
  }
  // Deep clone
  const filtered = JSON.parse(JSON.stringify(docsJson));
  if (filtered.navigation && filtered.navigation.tabs) {
    for (const tab of filtered.navigation.tabs) {
      if (tab.groups) {
        for (const group of tab.groups) {
          if (group.pages) group.pages = filterPages(group.pages);
        }
        tab.groups = tab.groups.map(g => ({...g, pages: g.pages})).filter(g => g.pages && g.pages.length);
      }
    }
    filtered.navigation.tabs = filtered.navigation.tabs.map(t => ({...t, groups: t.groups})).filter(t => t.groups && t.groups.length);
  }

  // Write filtered docs.json
  await fs.writeFile(path.join(out, 'docs.json'), JSON.stringify(filtered, null, 2));

  // Copy other assets (images, logo, favicon) to the build
  async function copyAssets(folder) {
    const full = path.join(docsDir, folder);
    try {
      const assets = await fs.readdir(full);
      for (const asset of assets) {
        const src = path.join(full, asset);
        const stat = await fs.stat(src);
        if (stat.isFile()) {
          await copyFile(src, path.join(out, folder, asset));
        }
      }
    } catch (err) {
      // folder not found, ignore
    }
  }
  for (const folder of ['images', 'logo', 'snippets']) {
    await copyAssets(folder);
  }
  // Copy other top-level assets
  await copyAssets('favicon.svg'.replace(/^(.*?)$/, '$1'));
  await fs.copyFile(path.join(docsDir, 'favicon.svg'), path.join(out, 'favicon.svg')).catch(()=>{});
  // Copy openapi spec if present
  await fs.copyFile(path.join(docsDir, 'api-reference', 'openapi.json'), path.join(out, 'api-reference', 'openapi.json')).catch(()=>{});

  console.log(`Audience build complete: ${out}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
