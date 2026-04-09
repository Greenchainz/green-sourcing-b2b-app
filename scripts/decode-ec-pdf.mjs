import fs from 'fs';
import zlib from 'zlib';

const PDF_PATH = "H:/-random_green_knowledge/ec_tables_extracted/Fwd_ Embodied carbon tables/EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf";

const buf = fs.readFileSync(PDF_PATH);
const str = buf.toString('binary');

// ── Step 1: Parse all ToUnicode CMaps ────────────────────────────────────────
const cmaps = {};
const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let m;
while ((m = streamRe.exec(str)) !== null) {
  try {
    const inflated = zlib.inflateSync(Buffer.from(m[1], 'binary')).toString('latin1');
    if (!inflated.includes('beginbfrange') && !inflated.includes('beginbfchar')) continue;
    const nameMatch = inflated.match(/\/CMapName\s*\/(\S+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    cmaps[name] = {};
    const rangeBlock = inflated.match(/beginbfrange([\s\S]*?)endbfrange/);
    if (rangeBlock) {
      for (const line of rangeBlock[1].trim().split('\n')) {
        const match = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
        if (match && match[1] === match[2])
          cmaps[name][parseInt(match[1], 16)] = String.fromCharCode(parseInt(match[3], 16));
      }
    }
    const charBlock = inflated.match(/beginbfchar([\s\S]*?)endbfchar/);
    if (charBlock) {
      for (const line of charBlock[1].trim().split('\n')) {
        const match = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
        if (match)
          cmaps[name][parseInt(match[1], 16)] = String.fromCharCode(parseInt(match[2], 16));
      }
    }
  } catch(e) {}
}

// ── Step 2: Build object map ─────────────────────────────────────────────────
const objMap = {};
const objRe = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
while ((m = objRe.exec(str)) !== null) objMap[m[1]] = m[2];

// ── Step 3: Map font objects to their CMap names via ToUnicode ───────────────
const objToCmap = {};
for (const [objNum, content] of Object.entries(objMap)) {
  if (!content.includes('/ToUnicode')) continue;
  const tuMatch = content.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
  if (!tuMatch) continue;
  const tuContent = objMap[tuMatch[1]] || '';
  try {
    const tuStream = tuContent.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (tuStream) {
      const decoded = zlib.inflateSync(Buffer.from(tuStream[1], 'binary')).toString('latin1');
      const nm = decoded.match(/\/CMapName\s*\/(\S+)/);
      if (nm) objToCmap[objNum] = nm[1];
    }
  } catch(e) {}
}

// ── Step 4: Map font resource names (R9, R11...) to CMaps ────────────────────
const fontMappings = {};
const resDictRe = /\/Resources\s*<<([\s\S]*?)>>/g;
while ((m = resDictRe.exec(str)) !== null) {
  const fontBlock = m[1].match(/\/Font\s*<<([\s\S]*?)>>/);
  if (!fontBlock) continue;
  const entries = fontBlock[1].match(/\/(R\d+)\s+(\d+)\s+0\s+R/g) || [];
  entries.forEach(e => {
    const parts = e.match(/\/(R\d+)\s+(\d+)/);
    if (parts) fontMappings[parts[1]] = parts[2];
  });
}

const fontToCmap = {};
for (const [fontRes, objNum] of Object.entries(fontMappings)) {
  if (objToCmap[objNum]) fontToCmap[fontRes] = cmaps[objToCmap[objNum]];
}

// ── Step 5: Decode content streams ───────────────────────────────────────────
function decodeStr(raw, cmap) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    out += cmap[code] || '';
  }
  return out;
}

function decodeContentStream(stream, ftc) {
  const result = [];
  const btBlocks = stream.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btBlocks) {
    let currentFont = null;
    for (const line of block.split('\n')) {
      const tfMatch = line.match(/\/(R\d+)\s+[\d.]+\s+Tf/);
      if (tfMatch) { currentFont = tfMatch[1]; continue; }

      const tjMatch = line.match(/\(([^)]*)\)\s*Tj$/);
      if (tjMatch && currentFont && ftc[currentFont]) {
        const d = decodeStr(tjMatch[1], ftc[currentFont]);
        if (d.trim()) result.push(d);
        continue;
      }

      const tjArrMatch = line.match(/\[(.*)\]\s*TJ$/);
      if (tjArrMatch && currentFont && ftc[currentFont]) {
        const parts = tjArrMatch[1].match(/\(([^)]*)\)/g) || [];
        const d = parts.map(p => decodeStr(p.slice(1, -1), ftc[currentFont])).join('');
        if (d.trim()) result.push(d);
      }
    }
  }
  return result;
}

const streamRe2 = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let pageNum = 0;
const allText = [];
while ((m = streamRe2.exec(str)) !== null) {
  try {
    const inflated = zlib.inflateSync(Buffer.from(m[1], 'binary')).toString('latin1');
    if (!inflated.includes('BT') || !inflated.includes('Tf')) continue;
    const tokens = decodeContentStream(inflated, fontToCmap);
    if (tokens.length > 0) {
      console.log(`\n====== PAGE ${++pageNum} ======`);
      tokens.forEach(t => { console.log(t); allText.push(t); });
    }
  } catch(e) {}
}

// Write all decoded text to a file for analysis
fs.writeFileSync('H:/-random_green_knowledge/ec_decoded.txt', allText.join('\n'));
console.log('\n\nAll text written to H:/-random_green_knowledge/ec_decoded.txt');
