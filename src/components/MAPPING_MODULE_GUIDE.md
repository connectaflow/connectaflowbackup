/**
 * ==================================================================================
 * RESILIENT MAPPING MODULE — GUIDE & IMPLEMENTATION NOTES
 * ==================================================================================
 *
 * OVERVIEW
 * --------
 * The mapping module has been enhanced with fuzzy matching and custom field support.
 * Previously, unrecognized headers defaulted to "Skip column". Now, the system:
 *
 * 1. Uses fuzzy matching to intelligently pair headers with standard fields
 * 2. For unresolved headers, dynamically creates custom fields
 * 3. Clearly distinguishes between Mapped, Custom, and Skipped columns in the UI
 * 4. Allows users to manually override or create custom fields as needed
 *
 * ==================================================================================
 * KEY FEATURES
 * ==================================================================================
 *
 * FUZZY MATCHING
 * ------ -------
 * • Levenshtein distance algorithm (edit distance)
 * • Token-based matching (e.g., "first_name" matches "First Name")
 * • Configurable confidence threshold (default: 0.65)
 *
 * Example matches:
 * ├─ "firstName" → "First Name" (0.95+) ✓ Mapped
 * ├─ "first_name" → "First Name" (0.92) ✓ Mapped
 * ├─ "linkedin" → Not in schema → Custom field created
 * └─ "linkedin_url" → Not in schema → Custom field created
 *
 * CUSTOM FIELD CREATION
 * ====== ===== ========
 * Unmatched headers automatically create custom fields with:
 * • Key: custom_{normalized_header}
 *   └─ Example: "linkedin" → key "custom_linkedin"
 * • Label: Raw header name (for UI display)
 * • Tracked in component state, persisted to backend via mapping
 *
 * FIELD STATUS TRACKING
 * ===== ====== ========
 * Each column displays one of three statuses in the header row:
 * ├─ MAPPED (Cyan)    — Matched to a standard field
 * ├─ CUSTOM (Purple)  — Created as a new custom field
 * └─ SKIPPED (Slate)  — Not mapped (explicit choice or no match)
 *
 * MANUAL OVERRIDE
 * ====== ========
 * Users can:
 * ├─ Click any dropdown to change field mapping
 * ├─ See both standard and custom fields in the dropdown
 * ├─ Create inline new custom fields in the dropdown
 * └─ Skip any column explicitly
 *
 * ==================================================================================
 * COMPONENT STRUCTURE
 * ==================================================================================
 *
 * MappingSheet
 *   ├─ Props:
 *   │  ├─ headers: string[]                    (CSV column names)
 *   │  ├─ rows: string[][]                     (CSV data preview)
 *   │  ├─ availableFields: MappingSheetField[] (standard fields)
 *   │  ├─ onConfirm: (mapping, rows) => void  (callback on confirm)
 *   │  ├─ onCancel: () => void                 (callback on cancel)
 *   │  └─ confirmLabel?: string                (button text)
 *   │
 *   ├─ State:
 *   │  ├─ customFields[]                       (user-created custom fields)
 *   │  ├─ mapping: FieldMapping                (header → field key)
 *   │  └─ selectedRows: Set<number>            (rows to import)
 *   │
 *   └─ Renders:
 *      ├─ Header bar (with custom field count, row selection summary)
 *      ├─ Info section (warnings & custom field list)
 *      └─ Data grid
 *         ├─ Row 1: Field dropdowns (with custom field creation)
 *         ├─ Row 2: Column names + status badges
 *         └─ Data rows (with bulk selection)
 *
 * ColumnDropdown
 *   ├─ Props:
 *   │  ├─ value: string                 (currently selected field key)
 *   │  ├─ fields: MappingSheetField[]   (available fields)
 *   │  ├─ onChange: (key) => void       (selection change)
 *   │  ├─ onCreateCustom?: (name) => void (custom field creation)
 *   │  └─ headerName?: string           (for context)
 *   │
 *   └─ Renders:
 *      ├─ Button (with field label or "Skip column")
 *      └─ Dropdown menu
 *         ├─ Skip column option
 *         ├─ Standard Fields section
 *         ├─ Custom Fields section
 *         └─ Custom field creation input + button
 *
 * ==================================================================================
 * FUZZY MATCHING ALGORITHM
 * ==================================================================================
 *
 * Location: frontend/src/lib/fuzzyMatch.ts
 *
 * Main export: fuzzyMatch(header, availableFields, threshold)
 *
 * Algorithm overview:
 * 1. Normalize both header and field names:
 *    • Lowercase
 *    • Remove punctuation
 *    • Split on whitespace, underscores, hyphens
 *
 * 2. Calculate similarity scores:
 *    • Exact key match: 1.0
 *    • Exact label match: 0.95
 *    • Subset match (all tokens found): 0.85-0.9
 *    • Token similarity: Levenshtein distance on tokens
 *
 * 3. Return result:
 *    • If best score ≥ threshold: return matched field + score
 *    • If best score < threshold: return custom field marker
 *
 * Scoring factors:
 * ├─ Exact matches scored highest (0.95-1.0)
 * ├─ Partial matches with all tokens: 0.85-0.9
 * ├─ Token-level Levenshtein similarity: 0.3-0.8
 * └─ Short headers with low confidence penalized by 30%
 *
 * ==================================================================================
 * STORAGE & BACKEND INTEGRATION
 * ==================================================================================
 *
 * Frontend Storage:
 * • mapping: FieldMapping object
 *   └─ Example: {
 *        "First Name": "first_name",
 *        "LinkedIn Profile": "custom_linkedin",
 *        "Unimportant Column": ""
 *      }
 *
 * Backend Integration:
 * 1. Receive mapping object from MappingSheet.onConfirm()
 * 2. For each column + mapping:
 *    • If mapping is empty → skip column
 *    • If mapping starts with "custom_" → store in custom_data[mapping] = value
 *    • If mapping is a standard field → store in standard field
 *
 * Example processing:
 * ├─ mapping = {
 * │    "First Name": "first_name" → set lead.first_name
 * │    "LinkedIn": "custom_linkedin" → set lead.custom_data["custom_linkedin"]
 * │    "Unused": "" → skip
 * └─ }
 *
 * ==================================================================================
 * TYPES
 * ==================================================================================
 *
 * FieldMapping
 * • Dictionary: { [columnHeader: string]: string }
 * • Maps CSV column headers to field keys (standard or custom_*)
 *
 * MappingSheetField
 * • key: string          (internal identifier, e.g., "domain" or "custom_linkedin")
 * • label: string        (display name, e.g., "Domain" or "LinkedIn Profile")
 * • required?: boolean   (whether column must be mapped)
 * • description?: string (hover text)
 * • isCustom?: boolean   (true for dynamically created fields)
 *
 * FieldStatus
 * • "mapped" | "custom" | "skipped"
 * • Determines visual styling in header row
 *
 * FuzzyMatchResult
 * • { fieldKey: string; score: number; isCustom: false }
 *
 * CustomFieldMatch
 * • { headerName: string; isCustom: true }
 *
 * MatchResult = FuzzyMatchResult | CustomFieldMatch
 *
 * ==================================================================================
 * CONFIGURATION & TUNING
 * ==================================================================================
 *
 * Fuzzy Match Threshold:
 * • Current: 0.65 (in MappingSheet.tsx, line ~228)
 * • Lower value (e.g., 0.5): More aggressive matching, more false positives
 * • Higher value (e.g., 0.8): Conservative, more custom fields created
 * • Recommended range: 0.6-0.75
 *
 * Custom Field Key Format:
 * • Current: custom_{normalized_header}
 * • Normalization: lowercase, remove non-word chars, join with underscore
 * • Example: "LinkedIn URL" → "custom_linkedin_url"
 *
 * ==================================================================================
 * EXAMPLES
 * ==================================================================================
 *
 * Example 1: E-mail Import with Additional Fields
 * ─────────────
 * CSV headers: ["First Name", "Last Name", "Email", "LinkedIn Profile", "Title"]
 *
 * Fuzzy matching results:
 * ├─ "First Name" → first_name (0.98) ✓ Mapped
 * ├─ "Last Name" → last_name (0.97) ✓ Mapped
 * ├─ "Email" → email (0.99) ✓ Mapped
 * ├─ "LinkedIn Profile" → No match → custom_linkedin_profile (auto-created)
 * └─ "Title" → No match → custom_title (auto-created)
 *
 * Expected mapping:
 * {
 *   "First Name": "first_name",
 *   "Last Name": "last_name",
 *   "Email": "email",
 *   "LinkedIn Profile": "custom_linkedin_profile",
 *   "Title": "custom_title"
 * }
 *
 * Example 2: Manual Override
 * ──────────────
 * User receives auto-mapping but decides:
 * • "LinkedIn Profile" should be mapped to standard "email" field (wrong choice, but allowed)
 * • "Title" should be created as custom field "job_title" instead of auto-generated key
 *
 * User actions:
 * 1. Click "LinkedIn Profile" dropdown → select "Work Email" → updates mapping
 * 2. Click "Title" dropdown → scroll to "Custom Fields" → change input to "Job Title" → click Add
 *
 * Result mapping:
 * {
 *   "First Name": "first_name",
 *   "Last Name": "last_name",
 *   "Email": "email",
 *   "LinkedIn Profile": "email",        // Overridden by user
 *   "Title": "custom_job_title"         // User-created with custom name
 * }
 *
 * ==================================================================================
 * FUTURE ENHANCEMENTS
 * ==================================================================================
 *
 * Potential improvements:
 * ├─ Persist custom field definitions for workspace (reuse in future imports)
 * ├─ Allow custom threshold configuration in UI
 * ├─ Show match confidence score in dropdown (0.73, 0.81, etc.)
 * ├─ Support regex-based field matching rules
 * ├─ Batch field creation from template
 * └─ Undo/Reset to auto-mapping button
 *
 * ==================================================================================
 */
