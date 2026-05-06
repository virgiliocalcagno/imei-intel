// After `next build`, copy .next/static into .next/standalone/.next/static so
// the standalone server can serve static assets. Next's docs document this as
// a manual step for the standalone output.

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const src = path.join(root, ".next", "static");
const dest = path.join(root, ".next", "standalone", ".next", "static");

function copyDir(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
    const sp = path.join(s, entry.name);
    const dp = path.join(d, entry.name);
    if (entry.isDirectory()) copyDir(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
}

if (!fs.existsSync(src)) {
  console.error(`[postbuild] .next/static not found, did "next build" run?`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
console.log(`[postbuild] copied .next/static → .next/standalone/.next/static`);
