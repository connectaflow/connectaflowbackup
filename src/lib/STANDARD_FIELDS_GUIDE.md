/**
 * ==================================================================================
 * STANDARD FIELDS MAPPING — COMPLETE REFERENCE GUIDE
 * ==================================================================================
 *
 * OVERVIEW
 * --------
 * The System now includes a comprehensive STANDARD_FIELDS schema with 20 predefined
 * fields covering personal info, company data, location, contact info, and verification
 * status. Each field includes intelligent aliases for fuzzy matching.
 *
 * ==================================================================================
 * QUICK START
 * ==================================================================================
 *
 * Import standard fields in your component:
 * ──────────────────────────────────────────
 *
 * import { getStandardFieldsForUI } from '../lib/standardFields';
 * import { fuzzyMatchBatchWithStandards } from '../lib/fuzzyMatch';
 *
 * // Get all standard fields for UI display
 * const fields = getStandardFieldsForUI();
 *
 * // Auto-match CSV headers to standard fields
 * const csvHeaders = ['First Name', 'Mobile', 'linkedin', 'Title'];
 * const mappings = fuzzyMatchBatchWithStandards(csvHeaders);
 *
 * ==================================================================================
 * COMPLETE FIELD LIST & ALIASES
 * ==================================================================================
 *
 * PERSONAL INFORMATION
 * ─────────────────────
 *
 * 1. firstName
 *    Label: First Name
 *    Category: personal
 *    Aliases: first name, first_name, fname, given name, givenname
 *    Example match: "FirstName" ✓ 1.0, "fname" ✓ 0.96, "first" ✓ 0.92
 *
 * 2. lastName
 *    Label: Last Name
 *    Category: personal
 *    Aliases: last name, last_name, lname, surname, family name, familyname
 *    Example match: "LastName" ✓ 1.0, "surname" ✓ 0.96
 *
 * 3. title
 *    Label: Title
 *    Category: personal
 *    Aliases: job title, job_title, jobtitle, position, designation, role
 *    Example match: "Title" ✓ 1.0, "position" ✓ 0.96, "role" ✓ 0.92
 *
 * 4. level
 *    Label: Seniority Level
 *    Category: personal
 *    Aliases: seniority, level, seniority level, career level, seniorityLevel
 *    Example match: "Level" ✓ 1.0, "seniority" ✓ 0.96
 *
 * COMPANY INFORMATION
 * ───────────────────
 *
 * 5. companyName
 *    Label: Company Name
 *    Category: company
 *    Aliases: company, company name, company_name, organization, org, account,
 *             account name, accountname
 *    Example match: "Company" ✓ 0.96, "Account" ✓ 0.90
 *
 * 6. companyWebsite
 *    Label: Company Website
 *    Category: company
 *    Aliases: website, domain, company website, company_website, companywebsite,
 *             url, company domain, companydomain, web
 *    Example match: "Website" ✓ 0.96, "domain" ✓ 0.92
 *
 * 7. department
 *    Label: Department
 *    Category: company
 *    Aliases: dept, department, dept.
 *    Example match: "Dept" ✓ 0.96
 *
 * 8. industry
 *    Label: Industry
 *    Category: company
 *    Aliases: industry, sector, vertical
 *    Example match: "Industry" ✓ 1.0, "sector" ✓ 0.92
 *
 * 9. subIndustry
 *    Label: Sub-Industry
 *    Category: company
 *    Aliases: sub industry, sub_industry, subindustry, sub-industry, vertical, segment
 *    Example match: "SubIndustry" ✓ 0.96
 *
 * 10. companyHeadCount
 *     Label: Company Headcount
 *     Category: company
 *     Aliases: headcount, head count, head_count, employees, company headcount,
 *              company_headcount, company size, companysize, size, headcount range
 *     Example match: "Headcount" ✓ 0.96, "Employees" ✓ 0.90
 *
 * 11. companyRevenue
 *     Label: Company Revenue
 *     Category: company
 *     Aliases: revenue, annual revenue, annual_revenue, company revenue,
 *              company_revenue, revenue range, revenue_range
 *     Example match: "Revenue" ✓ 0.96, "Annual Revenue" ✓ 0.95
 *
 * LOCATION
 * ────────
 *
 * 12. country
 *     Label: Country
 *     Category: personal
 *     Aliases: country, nation, country code, countrycode, country_code
 *     Example match: "Country" ✓ 1.0
 *
 * 13. state
 *     Label: State
 *     Category: personal
 *     Aliases: state, province, region, state_code, statecode
 *     Example match: "State" ✓ 1.0, "Province" ✓ 0.92
 *
 * 14. city
 *     Label: City
 *     Category: personal
 *     Aliases: city, town, locality
 *     Example match: "City" ✓ 1.0, "Town" ✓ 0.92
 *
 * 15. address
 *     Label: Address
 *     Category: personal
 *     Aliases: address, street address, street_address, location, full address
 *     Example match: "Address" ✓ 1.0
 *
 * CONTACT INFORMATION (CRITICAL)
 * ──────────────────────────────
 *
 * 16. email
 *     Label: Email
 *     Category: contact
 *     Aliases: email, email address, emailaddress, email_address, work email,
 *              workemail, e-mail, mail
 *     Example match: "Email" ✓ 1.0, "Work Email" ✓ 0.95
 *
 * 17. mobileNumber ⭐ (CRITICAL ADDITION)
 *     Label: Mobile Number
 *     Category: contact
 *     Aliases: mobile, mobile number, mobile_number, mobilenumber, phone,
 *              cell, cell phone, cellphone, mobile phone, mobilephone,
 *              phone number, phonenumber, contact phone, telephone, tel
 *     Example match:
 *       - "Mobile" ✓ 1.0
 *       - "Phone" ✓ 1.0
 *       - "Cell" ✓ 1.0
 *       - "Phone Number" ✓ 0.95
 *       - "mobile_number" ✓ 0.98
 *       - "Contact Phone" ✓ 0.96
 *
 * 18. linkedin
 *     Label: LinkedIn Profile
 *     Category: contact
 *     Aliases: linkedin, linkedin profile, linkedin_profile, linkedinprofile,
 *              linkedin url, linkedin_url, linkedinurl
 *     Example match: "LinkedIn" ✓ 1.0, "linkedin_profile" ✓ 0.95
 *
 * STATUS & VERIFICATION
 * ─────────────────────
 *
 * 19. status
 *     Label: Status
 *     Category: verification
 *     Aliases: status, lead status, leadstatus, lead_status, record status, recordstatus
 *     Example match: "Status" ✓ 1.0, "Lead Status" ✓ 0.95
 *
 * 20. verificationStatus
 *     Label: Verification Status
 *     Category: verification
 *     Aliases: verification status, verification_status, verificationstatus,
 *              verified, bounced, verify status, verifystatus
 *     Example match: "Verification Status" ✓ 0.95, "Verified" ✓ 0.90
 *
 * ==================================================================================
 * FUZZY MATCHING EXAMPLES
 * ==================================================================================
 *
 * Example 1: Standard Field Recognition
 * ······································
 * CSV Headers: ["First Name", "Last Name", "Title", "Email"]
 *
 * Matching results:
 * ├─ "First Name" → firstName (exact, 1.0)
 * ├─ "Last Name" → lastName (exact, 1.0)
 * ├─ "Title" → title (exact, 1.0)
 * └─ "Email" → email (exact, 1.0)
 *
 *
 * Example 2: Alias-Based Matching (Phone Number Handling) ⭐ KEY
 * ───────────────────────────────────────────────────────
 * CSV Headers: ["First Name", "Phone", "Mobile Number", "Cell Phone"]
 *
 * Matching results:
 * ├─ "First Name" → firstName (0.98)
 * ├─ "Phone" → mobileNumber (1.0 via alias match)
 * ├─ "Mobile Number" → mobileNumber (0.95 via alias match)
 * └─ "Cell Phone" → mobileNumber (0.96 via alias match)
 *
 * All phone variations correctly map to the SAME field (mobileNumber)!
 * This ensures consistent data collection.
 *
 *
 * Example 3: Fuzzy Matching with Typos
 * ····································
 * CSV Headers: ["Firt Name", "Emial", "Linkedn"]
 *
 * Matching results:
 * ├─ "Firt Name" → firstName (0.88 via Levenshtein)
 * ├─ "Emial" → email (0.89 via Levenshtein)
 * └─ "Linkedn" → linkedin (0.87 via Levenshtein)
 *
 * Typos still match correctly as long as they're within 0.65 threshold!
 *
 *
 * Example 4: No Skip Default Behavior
 * ·································
 * CSV Headers: ["First Name", "Department", "Custom Attribute"]
 *
 * Matching results:
 * ├─ "First Name" → firstName (standard field)
 * ├─ "Department" → department (standard field)
 * └─ "Custom Attribute" → custom_custom_attribute (auto-created custom field)
 *
 * Previously would skip "Custom Attribute"
 * Now creates custom field so NO DATA IS LOST
 *
 *
 * Example 5: Mixed Naming Conventions
 * ·································
 * CSV Headers: ["first_name", "LAST_NAME", "Phone_Number", "LinkedIn_URL"]
 *
 * Matching results:
 * ├─ "first_name" → firstName (0.95 via normalization)
 * ├─ "LAST_NAME" → lastName (0.95 via normalization)
 * ├─ "Phone_Number" → mobileNumber (0.96 via alias match)
 * └─ "LinkedIn_URL" → linkedin (0.95 via alias match)
 *
 * Handles snake_case, camelCase, UPPERCASE conventions!
 *
 * ==================================================================================
 * USAGE PATTERNS
 * ==================================================================================
 *
 * PATTERN 1: Use Standard Fields in MappingSheet
 * ──────────────────────────────────────────────
 *
 * import { getStandardFieldsForUI } from '../lib/standardFields';
 * import { MappingSheet } from './MappingSheet';
 *
 * export function MyImporter() {
 *   const csvHeaders = ['First Name', 'Mobile', 'Company'];
 *   const csvRows = [...];
 *
 *   return (
 *     <MappingSheet
 *       headers={csvHeaders}
 *       rows={csvRows}
 *       availableFields={getStandardFieldsForUI()}
 *       onConfirm={(mapping) => {
 *         // mapping = {
 *         //   "First Name": "firstName",
 *         //   "Mobile": "mobileNumber",
 *         //   "Company": "companyName"
 *         // }
 *         console.log('User confirmed:', mapping);
 *       }}
 *     />
 *   );
 * }
 *
 *
 * PATTERN 2: Programmatic Mapping without UI
 * ─────────────────────────────────────────
 *
 * import { fuzzyMatchBatchWithStandards } from '../lib/fuzzyMatch';
 *
 * const headers = ['FirstName', 'phone', 'linkedin'];
 * const mappings = fuzzyMatchBatchWithStandards(headers);
 *
 * // Result:
 * // {
 * //   'FirstName': { fieldKey: 'firstName', score: 0.95, isCustom: false },
 * //   'phone': { fieldKey: 'mobileNumber', score: 1.0, isCustom: false },
 * //   'linkedin': { fieldKey: 'linkedin', score: 1.0, isCustom: false }
 * // }
 *
 *
 * PATTERN 3: Custom + Standard Fields
 * ────────────────────────────────────
 *
 * import { getStandardFieldsForUI } from '../lib/standardFields';
 *
 * const customFields = [
 *   { key: 'custom_score', label: 'Lead Score' },
 *   { key: 'custom_notes', label: 'Sales Notes' }
 * ];
 *
 * const allFields = [...getStandardFieldsForUI(), ...customFields];
 *
 * // Use in MappingSheet
 * <MappingSheet
 *   availableFields={allFields}
 *   // ...
 * />
 *
 *
 * PATTERN 4: Access Single Field
 * ────────────────────────────────
 *
 * import { getStandardFieldByKey, getStandardFieldByAlias } from '../lib/standardFields';
 *
 * // Get field by key
 * const field = getStandardFieldByKey('mobileNumber');
 * console.log(field?.label); // "Mobile Number"
 *
 * // Get field by alias
 * const phoneField = getStandardFieldByAlias('phone');
 * console.log(phoneField?.key); // "mobileNumber"
 *
 * ==================================================================================
 * BACKEND INTEGRATION
 * ==================================================================================
 *
 * When receiving mapping from MappingSheet:
 *
 * mapping = {
 *   "First Name": "firstName",
 *   "Phone": "mobileNumber",
 *   "Unused Column": "",
 *   "Custom Data": "custom_additional_info"
 * }
 *
 * Processing logic:
 * ─────────────────
 * for (const [csvColumn, fieldKey] of Object.entries(mapping)) {
 *   const value = getRowValue(csvColumn);
 *
 *   if (!fieldKey) {
 *     // Skip empty mappings
 *     continue;
 *   }
 *
 *   if (fieldKey.startsWith('custom_')) {
 *     // Store in custom_data dict
 *     record.custom_data[fieldKey] = value;
 *   } else {
 *     // Store in standard field
 *     record[fieldKey] = value;
 *   }
 * }
 *
 * ==================================================================================
 * CONFIGURATION & TUNING
 * ==================================================================================
 *
 * Fuzzy Matching Threshold
 * ─────────────────────────
 * Location: MappingSheet.tsx line ~218
 * Current: 0.65
 *
 * Threshold behavior:
 * • 0.5:  Very aggressive matching (more false positives)
 * • 0.6:  Balanced (good default)
 * • 0.65: Conservative (recommended)
 * • 0.75: Very conservative (more custom fields created)
 *
 *
 * Adding New Aliases
 * ──────────────────
 * Edit standardFields.ts and modify the field's aliases array:
 *
 * {
 *   key: 'mobileNumber',
 *   label: 'Mobile Number',
 *   aliases: [
 *     'mobile',
 *     'phone',
 *     'cell',
 *     'contact_number'  // ← Add new alias here
 *   ]
 * }
 *
 *
 * Adding New Standard Fields
 * ───────────────────────────
 * 1. Add entry to STANDARD_FIELDS array in standardFields.ts
 * 2. Include: key, label, category, aliases[]
 * 3. ALIAS_MAP will auto-populate
 * 4. Field appears in getStandardFieldsForUI() output
 *
 * ==================================================================================
 * TROUBLESHOOTING
 * ==================================================================================
 *
 * Q: Why is my "Phone" column not matching mobileNumber?
 * A: Check threshold (default 0.65). If header has many typos, it may score below
 *    threshold. Verify it's in the aliases list and normalized properly.
 *
 * Q: Can I have multiple columns map to the same field?
 * A: Yes! MappingSheet prevents UI-level duplicates but logic allows it.
 *    In practice, consider which column is most authoritative and skip others.
 *
 * Q: How do I make a field NOT create a custom field?
 * A: Ensure it's in STANDARD_FIELDS with correct aliases and label.
 *    Test with fuzzyMatchWithStandards('YourHeader') to debug scoring.
 *
 * Q: Should I modify STANDARD_FIELDS?
 * A: Only add or adjust aliases. Don't remove fields without updating all consumers.
 *    Consider deprecation period before removal.
 *
 * ==================================================================================
 */
