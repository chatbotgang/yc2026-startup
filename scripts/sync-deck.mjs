// Copy Kade's presentation deck into public/deck so it's served at /display (see next.config.ts),
// on the same origin as /api/balance. Run again whenever the deck branch changes:
//   pnpm deck:sync                      (defaults to origin/kade/share-the-speed-deck)
//   pnpm deck:sync <git-ref>
import { execSync } from "node:child_process";
import { copyFileSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";

const ref = process.argv[2] ?? "origin/kade/share-the-speed-deck";
const out = "public/deck";
const DONATE_URL = "https://ngo.cresclab.com/pay";
const SITE_URL = "https://ngo.cresclab.com";

execSync("git fetch -q origin", { stdio: "inherit" });
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
execSync(`git archive ${ref} deck | tar -x --strip-components=1 -C ${out}`, { stdio: "inherit" });
rmSync(`${out}/README.md`, { force: true });
copyFileSync("scripts/deck/donate-widget.js", `${out}/donate-widget.js`);

const file = `${out}/index.html`;
let html = readFileSync(file, "utf8");
const patch = (re, to, what) => {
  if (!re.test(html)) throw new Error(`deck:sync could not find ${what} in ${ref}:deck/index.html`);
  html = html.replace(re, to);
};
// QR → public donate page; live data → this same origin.
patch(/window\.DONATE_URL\s*=\s*'[^']*';/, `window.DONATE_URL = '${DONATE_URL}';`, "window.DONATE_URL");
html = html.replace(/\n?window\.DONATE_API\s*=\s*[^;\n]*;/, "");
html = html.replace(/\n?window\.SITE_URL\s*=\s*[^;\n]*;/, "");
html = html.replace(/(window\.DONATE_URL = '[^']*';)/, `$1\nwindow.SITE_URL = '${SITE_URL}';\nwindow.DONATE_API = location.origin;`);
// The deck's own "raised live" row should read the API, not the donate page.
html = html.replace(/var API=\(window\.DONATE_URL\|\|''\)/, "var API=(window.DONATE_API||window.DONATE_URL||'')");
if (!html.includes('src="donate-widget.js"')) {
  patch(/<\/body>/, '<script src="donate-widget.js" defer></script>\n</body>', "</body>");
}
// Served at /display, so resolve the deck's relative asset paths against /deck/.
if (!html.includes('<base href="/deck/">')) patch(/<head>/, '<head>\n<base href="/deck/">', "<head>");
writeFileSync(file, html);
console.log(`deck synced from ${ref} → ${out}`);
