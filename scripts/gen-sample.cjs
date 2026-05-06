// Generates a sample Excel + CSV with realistic IMEIs for testing.
// - Most IMEIs are Luhn-valid (pass validation).
// - Some are duplicated on purpose to exercise dedup.
// - A couple are invalid to test the Luhn check.
// - A couple of ICCIDs (19 digits) are mixed in.

const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

function luhnCheckDigit(prefix14) {
  // Compute the check digit so the resulting 15-digit IMEI passes Luhn.
  let sum = 0;
  let alt = true; // rightmost-of-14 will be doubled (it's at "even from the right" when including check)
  for (let i = prefix14.length - 1; i >= 0; i--) {
    let n = prefix14.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return (10 - (sum % 10)) % 10;
}

function makeImei(tac, serial) {
  // tac = 8 digits (Type Allocation Code), serial = 6 digits → 14 digits, then Luhn check.
  const prefix = `${tac}${serial}`;
  return prefix + luhnCheckDigit(prefix);
}

function rndDigits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function rndSerial() {
  return rndDigits(6);
}

// A few realistic-looking TACs (these are public-format examples, not real device IDs).
const TACS = ["35201405", "35489012", "35715508", "86520203", "35912608"];

const rows = [];

// Generate 40 unique valid IMEIs.
const uniqueImeis = [];
for (let i = 0; i < 40; i++) {
  const tac = TACS[i % TACS.length];
  uniqueImeis.push(makeImei(tac, rndSerial()));
}
for (const imei of uniqueImeis) rows.push({ IMEI: imei });

// Add 5 deliberate duplicates (sprinkled in).
const dupes = [uniqueImeis[3], uniqueImeis[3], uniqueImeis[10], uniqueImeis[25], uniqueImeis[25]];
for (const d of dupes) rows.push({ IMEI: d });

// Add 2 invalid IMEIs (wrong check digit).
const bad1 = uniqueImeis[0].slice(0, 14) + ((Number(uniqueImeis[0].slice(14)) + 5) % 10);
const bad2 = "123456789012345"; // unlikely Luhn-valid
rows.push({ IMEI: bad1 });
rows.push({ IMEI: bad2 });

// Add 2 ICCIDs (19 digits, also Luhn).
function makeIccid(prefix18) {
  return prefix18 + luhnCheckDigit(prefix18);
}
rows.push({ IMEI: makeIccid("89014103211118510" + rndDigits(1)) });
rows.push({ IMEI: makeIccid("89860318123456" + rndDigits(4)) });

// Shuffle to mimic real-world data.
for (let i = rows.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [rows[i], rows[j]] = [rows[j], rows[i]];
}

// Add a row index for clarity.
const indexed = rows.map((r, i) => ({ "#": i + 1, IMEI: r.IMEI }));

const outDir = path.join(process.cwd(), "sample");
fs.mkdirSync(outDir, { recursive: true });

// Write CSV.
const csv = ["#,IMEI", ...indexed.map((r) => `${r["#"]},${r.IMEI}`)].join("\n");
fs.writeFileSync(path.join(outDir, "imeis-prueba.csv"), csv);

// Write XLSX.
const ws = XLSX.utils.json_to_sheet(indexed);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "IMEIs");
XLSX.writeFile(wb, path.join(outDir, "imeis-prueba.xlsx"));

console.log(
  `Generated ${rows.length} rows (${uniqueImeis.length} únicos, ${dupes.length} duplicados, 2 inválidos, 2 ICCIDs)`
);
console.log("Files:");
console.log(" -", path.join(outDir, "imeis-prueba.csv"));
console.log(" -", path.join(outDir, "imeis-prueba.xlsx"));
