/**
 * PDF byte-level decoder for the EWS Embodied Carbon tables.
 * Works directly on raw buffers to avoid string encoding issues
 * with control-character glyph codes inside PDF text operators.
 */
import fs from 'fs';
import zlib from 'zlib';

const PDF_PATH = "H:/-random_green_knowledge/ec_tables_extracted/Fwd_ Embodied carbon tables/EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf";

const fileBuf = fs.readFileSync(PDF_PATH);

// ── Parse object map (by byte offsets) ───────────────────────────────────────
function findObjects(buf) {
  const str = buf.toString('latin1');
  const objRe = /(\d+)\s+0\s+obj/g;
  const objs = {};
  let m;
  while ((m = objRe.exec(str)) !== null) {
    const start = m.index;
    const endMarker = str.indexOf('endobj', start);
    if (endMarker === -1) continue;
    objs[m[1]] = str.slice(start + m[0].length, endMarker);
  }
  return objs;
}

const objMap = findObjects(fileBuf);

// ── Inflate a stream from an object ──────────────────────────────────────────
function inflateObj(objContent) {
  const raw = objContent;
  const streamStart = raw.indexOf('stream');
  if (streamStart === -1) return null;
  let dataStart = streamStart + 6;
  if (raw[dataStart] === '\r') dataStart++;
  if (raw[dataStart] === '\n') dataStart++;
  const streamEnd = raw.indexOf('endstream', dataStart);
  if (streamEnd === -1) return null;
  const rawBytes = Buffer.from(raw.slice(dataStart, streamEnd), 'binary');
  try { return zlib.inflateSync(rawBytes); } catch { return null; }
}

// ── Parse all ToUnicode CMaps ─────────────────────────────────────────────────
function parseCMap(cmapStr) {
  const cmap = {};
  const rangeBlock = cmapStr.match(/beginbfrange([\s\S]*?)endbfrange/);
  if (rangeBlock) {
    for (const line of rangeBlock[1].trim().split('\n')) {
      const match = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
      if (match && match[1] === match[2])
        cmap[parseInt(match[1], 16)] = String.fromCharCode(parseInt(match[3], 16));
    }
  }
  const charBlock = cmapStr.match(/beginbfchar([\s\S]*?)endbfchar/);
  if (charBlock) {
    for (const line of charBlock[1].trim().split('\n')) {
      const match = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
      if (match)
        cmap[parseInt(match[1], 16)] = String.fromCharCode(parseInt(match[2], 16));
    }
  }
  return cmap;
}

// Map: objectNum -> CMap
const objCmaps = {};
for (const [objNum, content] of Object.entries(objMap)) {
  if (!content.includes('/ToUnicode')) continue;
  const tuMatch = content.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
  if (!tuMatch) continue;
  const tuContent = objMap[tuMatch[1]];
  if (!tuContent) continue;
  const inflated = inflateObj(tuContent);
  if (!inflated) continue;
  const cmapStr = inflated.toString('utf8');
  if (cmapStr.includes('beginbfrange') || cmapStr.includes('beginbfchar')) {
    objCmaps[objNum] = parseCMap(cmapStr);
  }
}

// Map font resource names (R9, R11, etc.) → CMap
const fontToCmap = {};
const str0 = fileBuf.toString('latin1');
const resDictRe = /\/Resources\s*<<([\s\S]*?)>>/g;
let m;
while ((m = resDictRe.exec(str0)) !== null) {
  const fontBlock = m[1].match(/\/Font\s*<<([\s\S]*?)>>/);
  if (!fontBlock) continue;
  const entries = fontBlock[1].match(/\/(R\d+)\s+(\d+)\s+0\s+R/g) || [];
  entries.forEach(e => {
    const parts = e.match(/\/(R\d+)\s+(\d+)/);
    if (parts && objCmaps[parts[2]]) fontToCmap[parts[1]] = objCmaps[parts[2]];
  });
}

console.log('Fonts decoded:', Object.keys(fontToCmap).join(', '));

// ── Byte-level PDF content stream parser ──────────────────────────────────────
function extractTextFromContentBuf(contentBuf, ftc) {
  const tokens = [];
  let i = 0;
  let currentFont = null;

  function readToken() {
    // Skip whitespace
    while (i < contentBuf.length && (contentBuf[i] === 0x20 || contentBuf[i] === 0x09 ||
           contentBuf[i] === 0x0a || contentBuf[i] === 0x0d)) i++;
    if (i >= contentBuf.length) return null;

    // String literal (...)
    if (contentBuf[i] === 0x28) {
      i++; // skip (
      const bytes = [];
      while (i < contentBuf.length && contentBuf[i] !== 0x29) {
        if (contentBuf[i] === 0x5c) { // backslash escape
          i++;
          const esc = contentBuf[i];
          if (esc === 0x6e) bytes.push(0x0a);
          else if (esc === 0x72) bytes.push(0x0d);
          else if (esc === 0x74) bytes.push(0x09);
          else bytes.push(esc);
          i++;
        } else {
          bytes.push(contentBuf[i++]);
        }
      }
      i++; // skip )
      return { type: 'string', bytes };
    }

    // Array [...]
    if (contentBuf[i] === 0x5b) {
      i++;
      const items = [];
      while (i < contentBuf.length && contentBuf[i] !== 0x5d) {
        const t = readToken();
        if (t) items.push(t);
      }
      i++;
      return { type: 'array', items };
    }

    // Name /Foo
    if (contentBuf[i] === 0x2f) {
      i++;
      let name = '';
      while (i < contentBuf.length && contentBuf[i] > 0x20 &&
             contentBuf[i] !== 0x5b && contentBuf[i] !== 0x3c && contentBuf[i] !== 0x3e) {
        name += String.fromCharCode(contentBuf[i++]);
      }
      return { type: 'name', value: name };
    }

    // Number or keyword
    let word = '';
    while (i < contentBuf.length && contentBuf[i] > 0x20 &&
           contentBuf[i] !== 0x28 && contentBuf[i] !== 0x29 &&
           contentBuf[i] !== 0x5b && contentBuf[i] !== 0x5d) {
      word += String.fromCharCode(contentBuf[i++]);
    }
    if (!word) { i++; return null; }
    if (!isNaN(word)) return { type: 'number', value: parseFloat(word) };
    return { type: 'op', value: word };
  }

  function decodeBytes(bytes, cmap) {
    return bytes.map(b => cmap[b] || '').join('');
  }

  const stack = [];
  while (i < contentBuf.length) {
    const token = readToken();
    if (!token) continue;

    if (token.type === 'op') {
      switch(token.value) {
        case 'BT': stack.length = 0; break;
        case 'ET': break;
        case 'Tf': {
          // stack should have [name, size]
          const size = stack.pop();
          const fontName = stack.pop();
          if (fontName && fontName.type === 'name') {
            currentFont = fontName.value;
          }
          break;
        }
        case 'Tj': {
          const s = stack.pop();
          if (s && s.type === 'string' && currentFont && ftc[currentFont]) {
            const text = decodeBytes(s.bytes, ftc[currentFont]);
            if (text.trim()) tokens.push(text);
          }
          break;
        }
        case 'TJ': {
          const arr = stack.pop();
          if (arr && arr.type === 'array' && currentFont && ftc[currentFont]) {
            const cmap = ftc[currentFont];
            const parts = arr.items
              .filter(t => t.type === 'string')
              .map(t => decodeBytes(t.bytes, cmap));
            const text = parts.join('');
            if (text.trim()) tokens.push(text);
          }
          break;
        }
        default:
          stack.length = 0;
      }
    } else {
      stack.push(token);
    }
  }

  return tokens;
}

// ── Process all content streams ───────────────────────────────────────────────
const allLines = [];
let pageNum = 0;

const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
const fullStr = fileBuf.toString('binary');
while ((m = streamRe.exec(fullStr)) !== null) {
  let infBuf;
  try {
    infBuf = zlib.inflateSync(Buffer.from(m[1], 'binary'));
  } catch { continue; }

  const infStr = infBuf.toString('latin1');
  if (!infStr.includes('BT') || !infStr.includes('Tf')) continue;

  const tokens = extractTextFromContentBuf(infBuf, fontToCmap);
  if (tokens.length > 0) {
    console.log(`\n====== PAGE ${++pageNum} ======`);
    tokens.forEach(t => {
      console.log(t);
      allLines.push(t);
    });
  }
}

fs.writeFileSync('H:/-random_green_knowledge/ec_decoded_v2.txt', allLines.join('\n'));
console.log('\n\nDecoded', allLines.length, 'text tokens. Written to ec_decoded_v2.txt');
