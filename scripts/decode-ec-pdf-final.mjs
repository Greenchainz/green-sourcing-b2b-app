import fs from 'fs';
import zlib from 'zlib';

const PDF_PATH = "H:/-random_green_knowledge/ec_tables_extracted/Fwd_ Embodied carbon tables/EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf";
const buf = fs.readFileSync(PDF_PATH);
const str = buf.toString('latin1');

// ── Parse object map ──────────────────────────────────────────────────────────
const objs = {};
const objRe = /(\d+)\s+0\s+obj([\s\S]{0,5000}?)endobj/g;
let m;
while ((m = objRe.exec(str)) !== null) objs[m[1]] = m[2];

// ── Inflate a compressed stream ───────────────────────────────────────────────
function inflate(content) {
  const sm = content.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  if (!sm) return null;
  try { return zlib.inflateSync(Buffer.from(sm[1], 'binary')); }
  catch { return null; }
}

// ── Parse CMap from inflated string ──────────────────────────────────────────
function parseCMap(src) {
  const cmap = {};
  const rb = src.match(/beginbfrange([\s\S]*?)endbfrange/);
  if (rb) for (const line of rb[1].trim().split('\n')) {
    const mm = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
    if (mm && mm[1] === mm[2])
      cmap[parseInt(mm[1], 16)] = String.fromCharCode(parseInt(mm[3], 16));
  }
  const cb = src.match(/beginbfchar([\s\S]*?)endbfchar/);
  if (cb) for (const line of cb[1].trim().split('\n')) {
    const mm = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
    if (mm) cmap[parseInt(mm[1], 16)] = String.fromCharCode(parseInt(mm[2], 16));
  }
  return cmap;
}

// ── Build font resource name → CMap (hardcoded from structure analysis) ───────
// R9 → Obj9(Calibri Bold) → ToUnicode Obj42 → CMap R42
// R11 → Obj11(Calibri)    → ToUnicode Obj44 → CMap R44
// R13 → Obj13(CambriaMath)→ ToUnicode Obj48 → CMap R48
// R15 → Obj15(Arial)      → ToUnicode Obj46 → CMap R46
// R26 → Obj26(Roboto)     → ToUnicode Obj50 → CMap R50
const fontResourceToTuObj = { R9: '42', R11: '44', R13: '48', R15: '46', R26: '50' };
const fontToCmap = {};
for (const [res, tuObjNum] of Object.entries(fontResourceToTuObj)) {
  const infBuf = inflate(objs[tuObjNum] || '');
  if (!infBuf) continue;
  fontToCmap[res] = parseCMap(infBuf.toString('latin1'));
}
console.log('Fonts ready:', Object.entries(fontToCmap).map(([k,v]) => `${k}(${Object.keys(v).length})`).join(' '));

// ── Decode glyph bytes using a CMap ──────────────────────────────────────────
function decodeBytes(bytes, cmap) {
  return bytes.map(b => cmap[b] ?? '').join('');
}

// ── Parse a PDF string literal (binary-safe) from a Buffer ───────────────────
// Returns { bytes, nextIdx }
function parsePdfString(buf, start) {
  // start points to the '(' byte
  let i = start + 1;
  const bytes = [];
  let depth = 1;
  while (i < buf.length && depth > 0) {
    const b = buf[i];
    if (b === 0x5c) { // backslash
      const esc = buf[++i];
      if      (esc === 0x6e) bytes.push(0x0a);
      else if (esc === 0x72) bytes.push(0x0d);
      else if (esc === 0x74) bytes.push(0x09);
      else if (esc === 0x62) bytes.push(0x08);
      else if (esc === 0x66) bytes.push(0x0c);
      else if (esc === 0x28) bytes.push(0x28);
      else if (esc === 0x29) bytes.push(0x29);
      else if (esc === 0x5c) bytes.push(0x5c);
      else if (esc >= 0x30 && esc <= 0x37) { // octal
        let octal = esc - 0x30;
        if (buf[i+1] >= 0x30 && buf[i+1] <= 0x37) { octal = octal*8 + (buf[++i] - 0x30); }
        if (buf[i+1] >= 0x30 && buf[i+1] <= 0x37) { octal = octal*8 + (buf[++i] - 0x30); }
        bytes.push(octal);
      } else bytes.push(esc);
      i++;
    } else if (b === 0x28) { depth++; bytes.push(b); i++; }
    else if (b === 0x29) { depth--; if (depth > 0) bytes.push(b); i++; }
    else { bytes.push(b); i++; }
  }
  return { bytes, nextIdx: i };
}

// ── Byte-level PDF content stream text extractor ─────────────────────────────
function extractText(contentBuf, ftc) {
  const tokens = [];
  let i = 0;
  let currentFont = null;
  let inBT = false;
  const stack = [];

  function skipWS() {
    while (i < contentBuf.length && (contentBuf[i] === 0x20 || contentBuf[i] === 0x09 ||
           contentBuf[i] === 0x0a || contentBuf[i] === 0x0d)) i++;
  }

  function readWord() {
    skipWS();
    let w = '';
    while (i < contentBuf.length && contentBuf[i] > 0x20 &&
           contentBuf[i] !== 0x28 && contentBuf[i] !== 0x29 &&
           contentBuf[i] !== 0x5b && contentBuf[i] !== 0x5d &&
           contentBuf[i] !== 0x3c && contentBuf[i] !== 0x3e &&
           contentBuf[i] !== 0x2f) {
      w += String.fromCharCode(contentBuf[i++]);
    }
    return w;
  }

  while (i < contentBuf.length) {
    skipWS();
    if (i >= contentBuf.length) break;
    const b = contentBuf[i];

    // String literal
    if (b === 0x28) {
      const result = parsePdfString(contentBuf, i);
      stack.push({ type: 'str', bytes: result.bytes });
      i = result.nextIdx;
      continue;
    }

    // Array
    if (b === 0x5b) {
      i++;
      const arrItems = [];
      skipWS();
      while (i < contentBuf.length && contentBuf[i] !== 0x5d) {
        if (contentBuf[i] === 0x28) {
          const r = parsePdfString(contentBuf, i);
          arrItems.push({ type: 'str', bytes: r.bytes });
          i = r.nextIdx;
        } else {
          // number (kerning) — skip
          let w = '';
          while (i < contentBuf.length && contentBuf[i] !== 0x28 &&
                 contentBuf[i] !== 0x5d && contentBuf[i] > 0x20) {
            w += String.fromCharCode(contentBuf[i++]);
          }
          skipWS();
        }
        skipWS();
      }
      i++; // skip ]
      stack.push({ type: 'arr', items: arrItems });
      continue;
    }

    // Name /Foo
    if (b === 0x2f) {
      i++;
      let name = '';
      while (i < contentBuf.length && contentBuf[i] > 0x20 &&
             contentBuf[i] !== 0x2f && contentBuf[i] !== 0x28 &&
             contentBuf[i] !== 0x5b && contentBuf[i] !== 0x3c) {
        name += String.fromCharCode(contentBuf[i++]);
      }
      stack.push({ type: 'name', value: name });
      continue;
    }

    // Keyword/number
    const word = readWord();
    if (!word) { i++; continue; }

    if (word === 'BT') { inBT = true; stack.length = 0; continue; }
    if (word === 'ET') { inBT = false; stack.length = 0; continue; }
    if (!inBT) { stack.length = 0; continue; }

    if (word === 'Tf') {
      const _size = stack.pop();
      const nameToken = stack.pop();
      if (nameToken?.type === 'name') currentFont = nameToken.value;
      stack.length = 0;
      continue;
    }

    if (word === 'Tj') {
      const s = stack.pop();
      if (s?.type === 'str' && currentFont && ftc[currentFont]) {
        const txt = decodeBytes(s.bytes, ftc[currentFont]);
        if (txt.trim()) tokens.push(txt);
      }
      stack.length = 0;
      continue;
    }

    if (word === 'TJ') {
      const arr = stack.pop();
      if (arr?.type === 'arr' && currentFont && ftc[currentFont]) {
        const cmap = ftc[currentFont];
        const txt = arr.items.map(t => decodeBytes(t.bytes, cmap)).join('');
        if (txt.trim()) tokens.push(txt);
      }
      stack.length = 0;
      continue;
    }

    // Any other operator clears stack
    stack.length = 0;
  }
  return tokens;
}

// ── Process all 3 page content streams ───────────────────────────────────────
// Page 1: Obj 4 → Contents Obj 5
// Page 2: Obj 19 → Contents Obj 20
// Page 3: Obj 23 → Contents Obj 24
const pageContentObjs = ['5', '20', '24'];
const allTokens = [];

for (let p = 0; p < pageContentObjs.length; p++) {
  const contentObjNum = pageContentObjs[p];
  const infBuf = inflate(objs[contentObjNum] || '');
  if (!infBuf) { console.log('Page', p+1, ': no inflated content'); continue; }

  const tokens = extractText(infBuf, fontToCmap);
  console.log(`\nPAGE ${p+1} — ${tokens.length} text tokens:`);
  tokens.forEach(t => { console.log(t); allTokens.push(t); });
}

fs.writeFileSync('H:/-random_green_knowledge/ec_final.txt', allTokens.join('\n'));
console.log('\n\nAll text written to ec_final.txt —', allTokens.length, 'tokens total');
