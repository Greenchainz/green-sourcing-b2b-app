# Architect Spec Upload UI — Implementation Summary

**Status:** Ready to test
**Route:** `/architect/specs/*`
**Created:** 2026-04-15

## Overview

Three-step flow to upload, parse, and find alternatives for Embodied Carbon Tables:

1. **Upload Page** (`/architect/specs/upload`) — Drag-drop file + optional project metadata
2. **Results Page** (`/architect/specs/[specId]`) — View parsed assemblies, run material matcher
3. **Listing Page** (`/architect/specs`) — See all your uploaded specs with status

## Architecture

### tRPC Endpoints (added to `architectSpec` router)

#### `uploadFile` (new)
Uploads a file to blob storage and returns the public URL.

```typescript
Input: { fileBufferBase64, originalFilename, mimeType? }
Output: { success: boolean, blobUrl: string }
```

**What it does:**
- Accepts base64-encoded file + metadata
- Calls `storagePut()` from `server/storage.ts` (uses Forge API storage proxy)
- Returns public blob URL for later reference

**Why separate?**
- Isolates file upload from parsing
- Allows progress tracking
- Lets server handle storage instead of exposing credentials to frontend

#### `uploadAndParse` (existing, unchanged)
Parses the spec PDF/XLSX and creates `architect_uploaded_specs` + `architect_spec_assemblies` rows.

```typescript
Input: { fileBufferBase64, blobUrl, originalFilename, mimeType?, projectName?, projectLocation?, estimatedValue? }
Output: { id, parseStatus, originalFilename, ... }
```

#### `matchAlternatives` (existing, unchanged)
Runs the Near-Match Algorithm to find sustainable alternatives.

```typescript
Input: { specId, topN?, persona? }
Output: MatchResultForRow[]
```

### Frontend Pages

#### `/architect/specs/upload` — Upload Page
- **Component:** `app/architect/specs/upload/page.tsx`
- **Features:**
  - Drag-drop zone (or click to select)
  - File validation: PDF/XLSX only, max 50MB
  - Optional project metadata (name, location, estimated value)
  - Real-time upload progress (25% → 50% → 75% → 100%)
  - Error handling with toast notifications
  - Auto-redirect to results on success

**Flow:**
1. Select file (drag-drop or click)
2. Fill optional project details
3. Click "Upload & Analyze"
4. Calls `uploadFile` → gets blob URL
5. Calls `uploadAndParse` with blob URL + base64
6. Toast success message
7. Redirect to `/architect/specs/[specId]`

#### `/architect/specs` — Listing Page
- **Component:** `app/architect/specs/page.tsx`
- **Features:**
  - Grid of all uploaded specs
  - Status badges (Ready, Processing, Failed, Pending)
  - Quick info: filename, project name, location, material value, upload date
  - "New Spec" button → `/architect/specs/upload`
  - Click row → details page
  - Empty state if no specs

#### `/architect/specs/[specId]` — Results Page
- **Component:** `app/architect/specs/[specId]/page.tsx`
- **Features:**
  - Project details (name, location, value)
  - Parse status with visual indicator
  - Material matcher panel (visible only if status === "ready"):
    - Architect persona selector (AOR, LEED AP, GC/PM, Spec Writer, Interior Designer)
    - Top N slider (1-20, default 5)
    - "Run Material Matcher" button
  - Parsed assemblies list:
    - Assembly code (e.g., EWS-1A)
    - Assembly type
    - Original GWP (kgCO₂e/1000sf)
    - Structural option
    - Match confidence bar (if matched)
    - Green "✓ Matched" badge if alternative was found

**Flow:**
1. View spec details
2. If parse status is "ready", configure matcher
3. Click "Run Material Matcher"
4. Calls `matchAlternatives`
5. Toast shows progress
6. Page auto-refreshes with new match data
7. Each assembly row shows its matched alternative + confidence

## UI Components Used

- **shadcn/ui:** Button, Input, Card, Badge, Skeleton
- **lucide-react:** Upload, File, AlertCircle, CheckCircle2, ArrowLeft, Loader2, Plus, Calendar
- **sonner:** Toast notifications
- **Tailwind:** All styling

## File Uploads — Storage Backend

Files are uploaded via `server/storage.ts` which uses a **Forge API storage proxy**:

```typescript
// In server/storage.ts
async function storagePut(relKey: string, data: Buffer, contentType: string) {
  // POST to BUILT_IN_FORGE_API_URL/v1/storage/upload
  // Returns { url: "https://storage.example.com/path" }
}
```

**Path pattern:** `architect-specs/{architectId}/{timestamp}-{originalFilename}`

Example: `architect-specs/user-123/1713184000000-embodied-carbon-tables.pdf`

The returned URL is stored in `architect_uploaded_specs.blobUrl` for reference.

## Error Handling

All errors show **toast notifications** with descriptive messages:

- File too large → "File is too large (max 50MB)"
- Wrong file type → "Only PDF and Excel files are supported"
- Upload fails → "Failed to upload file to storage"
- Parse fails → API error message from server
- Match fails → "Failed to find alternatives"

Errors also log to console (`console.error`).

## Data Flow Diagram

```
Upload Page
├─ User selects file + metadata
├─ Reads file as base64
├─ Calls architectSpec.uploadFile()
│  └─ server/storage.ts → storagePut()
│     └─ Returns blobUrl
├─ Calls architectSpec.uploadAndParse()
│  └─ server/services/architect-spec-parser.ts
│     └─ Azure Document Intelligence → parseArchitectSpec()
│     └─ Creates architect_uploaded_specs + architect_spec_assemblies rows
│     └─ Returns spec object
└─ Redirect to Results Page

Results Page
├─ Loads spec + assemblies via architectSpec.getSpec()
├─ Shows parse status
├─ If ready:
│  └─ User clicks "Run Material Matcher"
│  └─ Calls architectSpec.matchAlternatives()
│     └─ server/services/architect-spec-matcher.ts
│     └─ Finds alternatives, persists top match
│     └─ Returns alternatives with carbon delta
│  └─ Refreshes page to show matches

Listing Page
├─ Loads all specs via architectSpec.listSpecs()
├─ Shows status, project info, material value
├─ Click to view details → Results Page
```

## Testing Checklist

- [ ] Upload page renders without errors
- [ ] Drag-drop zone accepts PDF/XLSX files
- [ ] File validation rejects >50MB and non-PDF/XLSX
- [ ] Optional fields (projectName, location, value) are optional
- [ ] Upload progress bar animates 25→50→75→100%
- [ ] Success toast appears on completion
- [ ] Page redirects to results page after success
- [ ] Results page shows parsed assemblies
- [ ] Material matcher panel visible when parseStatus === "ready"
- [ ] Persona selector works (5 buttons)
- [ ] Top N slider works (1-20)
- [ ] "Run Material Matcher" calls mutation
- [ ] Match results show alternatives with carbon delta %
- [ ] Listing page shows all specs with status badges
- [ ] Click spec → navigate to results page

## Known Limitations

1. **Storage backend is Forge API proxy** — Uses `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` from environment. For production on Azure, you'd replace this with real Azure Blob Storage and SAS token generation. Current implementation works great for local/Replit dev.

2. **File upload is synchronous** — No chunking for very large files. 50MB is the practical limit. For >100MB files, add resumable upload later.

3. **No duplicate prevention** — User can upload the same file multiple times. Add deduplication (e.g., hash-based) if needed.

4. **Parse failures show status but no details** — If `parseStatus === "failed"`, there's no error message. Add an `parseError` column to `architect_uploaded_specs` for better UX.

5. **Matcher runs synchronously** — For large specs with 100+ assemblies, this could take seconds. Consider async job queue + polling later.

## Environment Variables

Required for uploads to work:

```env
BUILT_IN_FORGE_API_URL=<Forge storage API base URL>
BUILT_IN_FORGE_API_KEY=<Forge storage API key>
```

See `server/_core/env.ts` for how these are loaded.

## Next Steps

1. **Test the upload flow** — Go to `/architect/specs/upload`, upload a test PDF/XLSX, verify blob storage upload works.
2. **Fix any missing UI components** — If `Input`, `Card`, `Skeleton`, etc. are missing from shadcn/ui, scaffold them.
3. **Test the parser** — Verify `parseArchitectSpec()` correctly parses sample PDFs with real embodied carbon tables.
4. **Test the matcher** — Verify `matchSpecAlternatives()` returns ranked alternatives.
5. **Add error detail logging** — Parse failure reasons should be captured and shown to user.
6. **Implement async parse job** — For production, parse should be async (queue + webhook on completion).

## File Structure

```
app/architect/specs/
├── page.tsx                 (listing)
├── layout.tsx               (shared layout)
├── upload/
│   └── page.tsx             (upload form)
└── [specId]/
    └── page.tsx             (results + matcher)

server/routers/
└── architect-spec.ts        (tRPC endpoints: listSpecs, getSpec, uploadFile, uploadAndParse, matchAlternatives)
```

## Links

- Migration docs: [MIGRATION_0030_0031_NOTES.md](./MIGRATION_0030_0031_NOTES.md)
- Architect spec parser: `server/services/architect-spec-parser.ts`
- Architect spec matcher: `server/services/architect-spec-matcher.ts`
