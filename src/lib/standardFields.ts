/**
 * Standard fields schema for contact/company data mapping.
 * Defines all available standard fields with their aliases for fuzzy matching.
 */

import type { MappingSheetField } from '../components/MappingSheet';

export interface StandardField extends MappingSheetField {
  aliases?: string[];  // Common alternative names for this field
  category?: 'personal' | 'company' | 'contact' | 'verification';
}

export const STANDARD_FIELDS: StandardField[] = [
  // Personal Information
  {
    key: 'firstName',
    label: 'First Name',
    required: false,
    description: 'Person\'s first name',
    category: 'personal',
    aliases: ['first name', 'first_name', 'fname', 'given name', 'givenname'],
  },
  {
    key: 'lastName',
    label: 'Last Name',
    required: false,
    description: 'Person\'s last name',
    category: 'personal',
    aliases: ['last name', 'last_name', 'lname', 'surname', 'family name', 'familyname'],
  },
  {
    key: 'title',
    label: 'Title',
    required: false,
    description: 'Job title or position',
    category: 'personal',
    aliases: ['job title', 'job_title', 'jobtitle', 'position', 'designation', 'role'],
  },
  {
    key: 'level',
    label: 'Seniority Level',
    required: false,
    description: 'Career level (e.g., C-level, Manager, Individual Contributor)',
    category: 'personal',
    aliases: ['seniority', 'level', 'seniority level', 'career level', 'seniorityLevel'],
  },

  // Company Information
  {
    key: 'companyName',
    label: 'Company Name',
    required: false,
    description: 'Name of the company',
    category: 'company',
    aliases: ['company', 'company name', 'company_name', 'organization', 'org', 'account', 'account name', 'accountname'],
  },
  {
    key: 'companyWebsite',
    label: 'Company Website',
    required: false,
    description: 'Company domain or website URL',
    category: 'company',
    aliases: ['website', 'domain', 'company website', 'company_website', 'companywebsite', 'url', 'company domain', 'companydomain', 'web'],
  },
  {
    key: 'department',
    label: 'Department',
    required: false,
    description: 'Department within company',
    category: 'company',
    aliases: ['dept', 'department', 'dept.'],
  },
  {
    key: 'industry',
    label: 'Industry',
    required: false,
    description: 'Primary industry classification',
    category: 'company',
    aliases: ['industry', 'sector', 'vertical'],
  },
  {
    key: 'subIndustry',
    label: 'Sub-Industry',
    required: false,
    description: 'Secondary industry classification',
    category: 'company',
    aliases: ['sub industry', 'sub_industry', 'subindustry', 'sub-industry', 'vertical', 'segment'],
  },
  {
    key: 'companyHeadCount',
    label: 'Company Headcount',
    required: false,
    description: 'Number of employees',
    category: 'company',
    aliases: ['headcount', 'head count', 'head_count', 'employees', 'company headcount', 'company_headcount', 'company size', 'companysize', 'size', 'headcount range'],
  },
  {
    key: 'companyRevenue',
    label: 'Company Revenue',
    required: false,
    description: 'Annual revenue or revenue range',
    category: 'company',
    aliases: ['revenue', 'annual revenue', 'annual_revenue', 'company revenue', 'company_revenue', 'revenue range', 'revenue_range'],
  },

  // Location
  {
    key: 'country',
    label: 'Country',
    required: false,
    description: 'Country of residence or work',
    category: 'personal',
    aliases: ['country', 'nation', 'country code', 'countrycode', 'country_code'],
  },
  {
    key: 'state',
    label: 'State',
    required: false,
    description: 'State or province',
    category: 'personal',
    aliases: ['state', 'province', 'region', 'state_code', 'statecode'],
  },
  {
    key: 'city',
    label: 'City',
    required: false,
    description: 'City or locality',
    category: 'personal',
    aliases: ['city', 'town', 'locality'],
  },
  {
    key: 'address',
    label: 'Address',
    required: false,
    description: 'Full address or street address',
    category: 'personal',
    aliases: ['address', 'street address', 'street_address', 'location', 'full address'],
  },

  // Contact Information
  {
    key: 'email',
    label: 'Email',
    required: false,
    description: 'Email address',
    category: 'contact',
    aliases: ['email', 'email address', 'emailaddress', 'email_address', 'work email', 'workemail', 'e-mail', 'mail'],
  },
  {
    key: 'mobileNumber',
    label: 'Mobile Number',
    required: false,
    description: 'Mobile or cell phone number',
    category: 'contact',
    aliases: ['mobile', 'mobile number', 'mobile_number', 'mobilenumber', 'phone', 'cell', 'cell phone', 'cellphone', 'mobile phone', 'mobilephone', 'phone number', 'phonenumber', 'contact phone', 'telephone', 'tel'],
  },
  {
    key: 'linkedin',
    label: 'LinkedIn Profile',
    required: false,
    description: 'LinkedIn profile URL or username',
    category: 'contact',
    aliases: ['linkedin', 'linkedin profile', 'linkedin_profile', 'linkedinprofile', 'linkedin url', 'linkedin_url', 'linkedinurl'],
  },

  // Status & Verification
  {
    key: 'status',
    label: 'Status',
    required: false,
    description: 'Lead or contact status',
    category: 'verification',
    aliases: ['status', 'lead status', 'leadstatus', 'lead_status', 'record status', 'recordstatus'],
  },
  {
    key: 'verificationStatus',
    label: 'Verification Status',
    required: false,
    description: 'Data verification status (verified, bounced, etc.)',
    category: 'verification',
    aliases: ['verification status', 'verification_status', 'verificationstatus', 'verified', 'bounced', 'verify status', 'verifystatus'],
  },
];

/**
 * Built-in alias map for direct lookups
 * Maps normalized aliases → field key
 */
export const ALIAS_MAP: Record<string, string> = {};

// Build the alias map on module load
STANDARD_FIELDS.forEach((field) => {
  // Add the field key itself
  const normalizedKey = field.key.toLowerCase().replace(/[^\w]/g, '');
  ALIAS_MAP[normalizedKey] = field.key;

  // Add the label
  const normalizedLabel = field.label.toLowerCase().replace(/[^\w]/g, '');
  ALIAS_MAP[normalizedLabel] = field.key;

  // Add all aliases
  if (field.aliases) {
    field.aliases.forEach((alias) => {
      const normalized = alias.toLowerCase().replace(/[^\w]/g, '');
      ALIAS_MAP[normalized] = field.key;
    });
  }
});

/**
 * Get all standard fields as MappingSheetField[]
 * (without aliases which are internal only)
 */
export function getStandardFieldsForUI(): MappingSheetField[] {
  return STANDARD_FIELDS.map(({ aliases, category, ...rest }) => rest);
}

/**
 * Find a standard field by key or return undefined
 */
export function getStandardFieldByKey(key: string): StandardField | undefined {
  return STANDARD_FIELDS.find((f) => f.key === key);
}

/**
 * Find a standard field by an alias (case-insensitive)
 */
export function getStandardFieldByAlias(alias: string): StandardField | undefined {
  const normalized = alias.toLowerCase().replace(/[^\w]/g, '');
  const matchingKey = ALIAS_MAP[normalized];
  return matchingKey ? getStandardFieldByKey(matchingKey) : undefined;
}
