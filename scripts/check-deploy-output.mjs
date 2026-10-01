// Only the built app goes to Vercel, never the code (docs/RELEASE.md, A1; the
// user, 2026-10-01: the repository stays in their own GitHub). The release
// builds on GitHub and uploads `.vercel/output` with `vercel deploy --prebuilt`,
// and with each function the files its `.vc-config.json` maps in. This fails
// the release before the upload if any of them is a source map, a source file
// or an env file: a Next or Vercel update that started packing them would
// otherwise hand the code to whoever can sign in to Vercel.
import fs from "node:fs";
import path from "node:path";

const OUTPUT = ".vercel/output";

const REFUSED = [
  [/\.map$/, "a source map"],
  [/^(src|supabase|tests|scripts|docs|artwork|design-references|android|\.github|\.git)\//, "source"],
  [/\.(tsx?|mts|cts|sql|md)$/, "source"],
  [/(^|\/)\.env(?!\.example$)[^/]*$/, "an env file"],
];

// Symlinked folders are skipped: Vercel links a function to another that is walked anyway.
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isSymbolicLink()
        ? []
        : entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
    );

if (!fs.existsSync(OUTPUT)) {
  console.error(`No ${OUTPUT}: run \`vercel build\` first.`);
  process.exit(1);
}

const files = walk(OUTPUT);
const uploaded = new Set(files.map((file) => path.relative(OUTPUT, file)));
for (const config of files.filter((file) => file.endsWith(".vc-config.json"))) {
  const map = JSON.parse(fs.readFileSync(config, "utf8")).filePathMap ?? {};
  for (const [inside, onDisk] of Object.entries(map)) {
    uploaded.add(inside);
    uploaded.add(path.relative(".", onDisk));
  }
}

const refused = [...uploaded]
  .map((file) => file.split(path.sep).join("/"))
  .filter((file) => !file.split("/").includes("node_modules"))
  .flatMap((file) => REFUSED.filter(([pattern]) => pattern.test(file)).map(([, what]) => `${file} (${what})`));

for (const line of [...new Set(refused)].sort()) console.error(`Would upload ${line}.`);
if (refused.length) {
  console.error("Nothing but the built app may go to Vercel (docs/RELEASE.md, A1).");
  process.exit(1);
}
console.log(`${uploaded.size} files to upload: the built app, with no source, source map or env file.`);
