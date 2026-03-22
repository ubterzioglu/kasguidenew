# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Critical Non-Obvious Patterns

### Database & API
- **Unified Items Table**: All content (places, hotels, pets, artists) stored in single `items` table with `item_type` field. Legacy separate tables exist in `schema.sql` but should not be used.
- **SQL Template Tag**: Use `sql` template tag from `db/connection.js` (not raw queries) - parameterized automatically: `await sql`SELECT * FROM items WHERE status = ${status}``
- **Admin API Key**: Must use `X-API-Key` header (case-sensitive) - `headers: { 'X-API-Key': process.env.ADMIN_API_KEY }`
- **Status Workflow**: Items go through `pending` → `approved`/`rejected` → only `approved` items appear publicly

### File Uploads
- **Dual Storage**: Vercel Blob (production) vs local fallback (`public/uploads/`) - handled by `lib/upload.js`
- **2MB Limit**: Files >2MB rejected, only JPG/PNG/WEBP allowed
- **Filename Sanitization**: Turkish characters normalized (ğ→g, ü→u, ş→s) and special chars replaced with hyphens
- **Form Handling**: API routes with file uploads require `export const config = { api: { bodyParser: false } }`

### Turkish Language Context
- **UI Content**: All user-facing text is Turkish, but code comments/documentation are English
- **Slug Generation**: Auto-generated from Turkish titles with character normalization
- **Categories**: Defined in `categories.js` with SVG icons (client-side only, database uses category IDs)

### Development Commands
- **Database Reset**: `npm run db:reset` - completely resets database (destructive)
- **Unified Migration**: `npm run db:unified` - migrates to unified schema (forward-only, no rollback)
- **Local Dev**: `npm run dev` uses Vercel dev server, not standard Node.js server

### Security Gotchas
- **CSRF Not Implemented**: Stateless API design, but sensitive actions require API key
- **CSP Headers**: Applied via `vercel.json` - restricts inline scripts and unsafe-eval
- **Admin Endpoints**: Memory limits: 1024MB for admin/submit routes, 512MB for others

### Testing
- **No Automated Tests**: Manual testing only - run `npm run db:supabase:test` to verify DB connection
- **Formidable Required**: File upload API routes must disable body parser: `bodyParser: false`

### Architecture
- **Static Pages**: All frontend is static HTML that fetches data via API
- **Client-Side Routing**: `index.html` is main entry point with JavaScript routing
- **Legacy Code**: Some old tables exist but new development must use unified schema

### Environment
- **.env.local**: Required for local development (never commit)
- **Vercel Injection**: Production environment variables are injected automatically
- **SSL Required**: Database connection requires `sslmode=require` in connection string
