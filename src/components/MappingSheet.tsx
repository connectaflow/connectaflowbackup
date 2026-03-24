"use client";

/**
 * MappingSheet — shared spreadsheet-style CSV mapping component.
 *
 * Used by:
 *   • EnrichmentDashboard  (map columns → domain / company_name)
 *   • RecordImport          (map columns → lead fields)
 *
 * Design principles:
 *   • Sheet-first: data is presented as a scrollable grid, not a wizard.
 *   • User-controlled: every mapping decision is explicit, with smart defaults.
 *   • Incremental: row deselection is possible before committing the import.
 */

import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronDown, X, Table2, AlertCircle, Sparkles, Plus } from 'lucide-react';
import { fuzzyMatch, type MatchResult } from '../lib/fuzzyMatch';
import { ui } from '../lib/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldMapping = {
  [columnHeader: string]: string; // e.g. { "Company Domain": "domain", "Name": "company_name" }
};

export type FieldStatus = 'mapped' | 'custom' | 'skipped';

export type MappingSheetField = {
  key: string;         // internal key, e.g. "domain"
  label: string;       // displayed label, e.g. "Domain"
  required?: boolean;
  description?: string;
  isCustom?: boolean;  // true if this is a user-created custom field
};

export interface MappingSheetProps {
  /** Raw rows from the parsed CSV/XLSX — first row is the header */
  headers: string[];
  rows: string[][];
  /** Available field targets the user can map columns to */
  availableFields: MappingSheetField[];
  /** Called when the user confirms the mapping */
  onConfirm: (mapping: FieldMapping, selectedRows: number[]) => void;
  onCancel: () => void;
  confirmLabel?: string;
}

// ─── Column Mapping Dropdown ──────────────────────────────────────────────────

function ColumnDropdown({
  value,
  fields,
  onChange,
  onCreateCustom,
  headerName,
}: {
  value: string;
  fields: MappingSheetField[];
  onChange: (key: string) => void;
  onCreateCustom?: (headerName: string) => void;
  headerName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const selected = fields.find((f) => f.key === value);

  const standardFields = fields.filter((f) => !f.isCustom);
  const customFields = fields.filter((f) => f.isCustom);

  const handleCreateCustom = () => {
    if (customName.trim()) {
      onCreateCustom?.(customName.trim());
      setCustomName('');
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors w-full max-w-[160px]
          ${value
            ? selected?.isCustom
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/25 hover:bg-purple-500/15'
              : 'bg-brand-green/10 text-brand-green border border-brand-green/20 hover:bg-brand-green/15'
            : 'bg-bg-section text-text-secondary border border-border hover:border-border'
          }`}
      >
        <span className="flex-1 truncate text-left">
          {selected ? selected.label : 'Skip column'}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[240px] rounded-xl border border-border bg-bg-card py-1 shadow-2xl shadow-black/50 max-h-[400px] overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-section transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Skip column
            </button>
            
            {standardFields.length > 0 && (
              <>
                <div className="my-1 h-px bg-bg-section" />
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                  Standard Fields
                </div>
                {standardFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => { onChange(field.key); setOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-bg-section transition-colors"
                  >
                    <span className={`flex-1 text-left ${value === field.key ? 'text-brand-green font-semibold' : 'text-text-primary'}`}>
                      {field.label}
                    </span>
                    {field.required && (
                      <span className="text-[10px] text-amber-400/70">required</span>
                    )}
                    {value === field.key && (
                      <Check className="h-3 w-3 text-brand-green" />
                    )}
                  </button>
                ))}
              </>
            )}

            {customFields.length > 0 && (
              <>
                <div className="my-1 h-px bg-bg-section" />
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                  Custom Fields
                </div>
                {customFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => { onChange(field.key); setOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-bg-section transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    <span className={`flex-1 text-left ${value === field.key ? 'text-purple-300 font-semibold' : 'text-text-primary'}`}>
                      {field.label}
                    </span>
                    {value === field.key && (
                      <Check className="h-3 w-3 text-purple-400" />
                    )}
                  </button>
                ))}
              </>
            )}

            {onCreateCustom && (
              <>
                <div className="my-1 h-px bg-bg-section" />
                <div className="px-3 py-2 flex gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCustom()}
                    placeholder="Custom field name..."
                    className={ui.input}
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustom}
                    disabled={!customName.trim()}
                    className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-text-primary text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MappingSheet({
  headers,
  rows,
  availableFields,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm & Import',
}: MappingSheetProps) {
  // Track custom fields that user has created
  const [customFields, setCustomFields] = useState<MappingSheetField[]>([]);

  // Build smart initial mapping using fuzzy matching
  const { initialMapping, allFields } = useMemo(() => {
    const mapping: FieldMapping = {};
    const allFieldsList = [...availableFields, ...customFields];

    headers.forEach((header) => {
      // Convert fields to match fuzzyMatch signature, preserving aliases
      const fieldsForMatching = allFieldsList.map((f) => ({
        key: f.key,
        label: f.label,
        aliases: (f as any).aliases,
      }));

      const match = fuzzyMatch(header, fieldsForMatching, 0.65);

      if (match.isCustom) {
        // Create a custom field dynamically
        const customFieldKey = `custom_${header.toLowerCase().replace(/[^\w]/g, '_')}`;
        mapping[header] = customFieldKey;
        // Add to custom fields if not already there
        if (!allFieldsList.find((f) => f.key === customFieldKey)) {
          allFieldsList.push({
            key: customFieldKey,
            label: header,
            isCustom: true,
          });
        }
      } else {
        mapping[header] = match.fieldKey;
      }
    });

    return { initialMapping: mapping, allFields: allFieldsList };
  }, [headers, availableFields, customFields]);

  const [mapping, setMapping] = useState<FieldMapping>(initialMapping);
  // All rows selected by default
  const [selectedRows, setSelectedRows] = useState<Set<number>>(
    () => new Set(rows.map((_, i) => i))
  );

  // Combine available and custom fields for dropdown display
  const allAvailableFields = useMemo(
    () => [...availableFields, ...customFields],
    [availableFields, customFields]
  );

  // Get all currently mapped field keys
  const allMappedFields = useMemo(() => {
    return [...availableFields, ...customFields].filter((field) =>
      Object.values(mapping).includes(field.key)
    );
  }, [mapping, availableFields, customFields]);

  // Determine field status (mapped, custom, or skipped)
  const getFieldStatus = useCallback((header: string): FieldStatus => {
    const mappedKey = mapping[header];
    if (!mappedKey) return 'skipped';
    const field = allAvailableFields.find((f) => f.key === mappedKey);
    return field?.isCustom ? 'custom' : 'mapped';
  }, [mapping, allAvailableFields]);

  const previewRows = rows.slice(0, 200); // cap at 200 for perf

  const handleMappingChange = useCallback((header: string, fieldKey: string) => {
    setMapping((prev) => {
      // Un-map any other column that already uses this key (avoid duplicates)
      const next = { ...prev };
      if (fieldKey) {
        Object.keys(next).forEach((h) => {
          if (h !== header && next[h] === fieldKey) {
            next[h] = '';
          }
        });
      }
      next[header] = fieldKey;
      return next;
    });
  }, []);

  const handleCreateCustomField = useCallback((headerName: string) => {
    const customFieldKey = `custom_${headerName.toLowerCase().replace(/[^\w]/g, '_')}`;
    
    // Check if field already exists
    if (allAvailableFields.find((f) => f.key === customFieldKey)) {
      return;
    }

    const newCustomField: MappingSheetField = {
      key: customFieldKey,
      label: headerName,
      isCustom: true,
    };

    setCustomFields((prev) => [...prev, newCustomField]);
  }, [allAvailableFields]);

  const toggleRow = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedRows((prev) =>
      prev.size === previewRows.length
        ? new Set()
        : new Set(previewRows.map((_, i) => i))
    );
  }, [previewRows.length]);

  // Validation
  const mappedRequiredFields = useMemo(() => {
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    const required = availableFields.filter((f) => f.required).map((f) => f.key);
    return required.filter((k) => !mapped.has(k));
  }, [mapping, availableFields]);

  const canConfirm = mappedRequiredFields.length === 0 && selectedRows.size > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(mapping, Array.from(selectedRows).sort((a, b) => a - b));
  };

  // Column index → header index lookup
  const colIndexOf = (header: string) => headers.indexOf(header);

  // Helper to get display badge for field status
  const getStatusBadge = (status: FieldStatus) => {
    switch (status) {
      case 'mapped':
        return <span className="text-[9px] font-semibold text-brand-green">MAPPED</span>;
      case 'custom':
        return <span className="text-[9px] font-semibold text-purple-400">CUSTOM</span>;
      case 'skipped':
        return <span className="text-[9px] font-semibold text-text-muted">SKIPPED</span>;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-card">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-section shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
            <Table2 className="w-4 h-4 text-brand-green" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Map Your Columns</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {rows.length} rows · {headers.length} columns · {selectedRows.size} selected · {customFields.length} custom fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={ui.btnSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={ui.btnPrimary}
          >
            <Check className="w-3.5 h-3.5" />
            {confirmLabel}
          </button>
        </div>
      </div>

      {/* Info and warnings */}
      <div className="space-y-2 px-5 pt-3 pb-2 shrink-0">
        {/* Unmapped columns warning */}
        {headers.filter((h) => !mapping[h]).length > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-bg-section border border-border px-3 py-2">
            <AlertCircle className="w-4 h-4 text-text-secondary mt-0.5 shrink-0" />
            <p className="text-xs text-text-secondary">
              {headers.filter((h) => !mapping[h]).length} column{headers.filter((h) => !mapping[h]).length !== 1 ? 's' : ''} will be <strong>skipped</strong> on import.
            </p>
          </div>
        )}

        {/* Required fields warning */}
        {mappedRequiredFields.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              Map at least one column to:{' '}
              <strong>
                {mappedRequiredFields
                  .map((k) => availableFields.find((f) => f.key === k)?.label ?? k)
                  .join(', ')}
              </strong>
            </p>
          </div>
        )}

        {/* Custom fields info */}
        {customFields.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-purple-500/8 border border-purple-500/20 px-3 py-2">
            <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <p className="text-xs text-purple-300">
              {customFields.length} custom field{customFields.length !== 1 ? 's' : ''} will be created: <strong>{customFields.map((f) => f.label).join(', ')}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto min-h-0 mt-2 mx-5 mb-5 rounded-xl border border-border bg-bg-section">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-bg-section">
            {/* Row 1: Column mapper */}
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2 border-r border-border" />
              <th className="w-8 px-2 py-2 border-r border-border text-center text-text-muted font-normal">#</th>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 border-r border-border text-left align-middle bg-bg-section"
                >
                  <ColumnDropdown
                    value={mapping[header] ?? ''}
                    fields={allAvailableFields}
                    onChange={(key) => handleMappingChange(header, key)}
                    onCreateCustom={handleCreateCustomField}
                    headerName={header}
                  />
                </th>
              ))}
            </tr>

            {/* Row 2: Column headers */}
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2 border-r border-border text-center">
                <input
                  type="checkbox"
                  checked={selectedRows.size === previewRows.length && previewRows.length > 0}
                  onChange={toggleAll}
                  className="accent-cyan-500 rounded"
                />
              </th>
              <th className="w-8 px-2 py-2 border-r border-border text-text-muted font-mono font-normal" />
              {headers.map((header) => {
                const mappedField = allAvailableFields.find((f) => f.key === mapping[header]);
                const status = getFieldStatus(header);
                return (
                  <th
                    key={header}
                    className="px-3 py-2 border-r border-border text-left font-semibold text-text-secondary whitespace-nowrap"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span>{header}</span>
                      <div className="flex items-center gap-2">
                        {mappedField && (
                          <span className={`text-[10px] ${mappedField.isCustom ? 'text-purple-400' : 'text-brand-green'}/70 font-normal`}>
                            → {mappedField.label}
                          </span>
                        )}
                        {status !== 'skipped' && (
                          <div className="ml-auto">{getStatusBadge(status)}</div>
                        )}
                      </div>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-border transition-colors
                  ${selectedRows.has(rowIdx)
                    ? 'bg-brand-green/[0.03] hover:bg-brand-green/[0.05]'
                    : 'opacity-40 hover:opacity-60'
                  }`}
              >
                <td className="px-3 py-2 border-r border-border text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIdx)}
                    onChange={() => toggleRow(rowIdx)}
                    className="accent-cyan-500"
                  />
                </td>
                <td className="px-2 py-2 border-r border-border text-text-muted font-mono text-center">
                  {rowIdx + 1}
                </td>
                {headers.map((header) => {
                  const cellIdx = colIndexOf(header);
                  const value = row[cellIdx] ?? '';
                  const isMapped = !!mapping[header];
                  return (
                    <td
                      key={header}
                      className={`px-3 py-2 border-r border-border max-w-[200px] truncate
                        ${isMapped ? 'text-text-primary' : 'text-text-muted'}`}
                      title={value}
                    >
                      {value || <span className="text-text-muted">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length > 200 && (
          <div className="px-4 py-3 text-xs text-text-muted border-t border-border">
            Showing 200 of {rows.length} rows. All rows will be imported.
          </div>
        )}
      </div>
    </div>
  );
}
