// src/components/public/NetworkImporter.tsx
//
// Dynamic bulk import for paneldynamic fields.
// Column structure + validation rules are read from the form's templateElements.
// Configured per-paneldynamic in FormBuilder (allowBulkImport + bulkImportFields).

import { useState, useRef, useCallback } from 'react';
import type { Model } from 'survey-core';
import '../../styles/components/network-importer.css';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BulkImportField {
  name: string;
  required: boolean;
}

export interface BulkPanelConfig {
  questionName: string;
  templateElements: any[];   // raw SurveyJS templateElements from JSON
  bulkImportFields: BulkImportField[];
}

interface CellResult {
  raw: string;
  valid: boolean;
  error?: string;
  converted?: any;  // value to pass to SurveyJS (boolean → true/false, etc.)
}

interface RowResult {
  rowNum: number;
  cells: Record<string, CellResult>;
  valid: boolean;
}

interface Props {
  surveyModel: Model;
  config: BulkPanelConfig;
}

// ── Validation helpers ────────────────────────────────────────────────────────

function getChoices(templateEl: any): string[] {
  if (!templateEl?.choices) return [];
  return templateEl.choices.map((c: any) =>
    typeof c === 'string' ? c : (c.value ?? c.text ?? String(c))
  );
}

function validateCell(
  raw: string,
  templateEl: any,
  required: boolean
): CellResult {
  const value = raw?.trim() ?? '';

  if (!value) {
    if (required) return { raw, valid: false, error: 'Required' };
    return { raw, valid: true, converted: value };
  }

  const type = templateEl?.type ?? 'text';

  // ── boolean ──
  if (type === 'boolean') {
    const lower = value.toLowerCase();
    if (!['yes', 'no', 'true', 'false', '1', '0'].includes(lower)) {
      return { raw, valid: false, error: 'Use: yes / no' };
    }
    const converted = ['yes', 'true', '1'].includes(lower);
    return { raw, valid: true, converted };
  }

  // ── dropdown / radiogroup — match against choices ──
  if (type === 'dropdown' || type === 'radiogroup') {
    const choices = getChoices(templateEl);
    const match = choices.find(c => c.toLowerCase() === value.toLowerCase());
    if (!match) {
      return { raw, valid: false, error: `Options: ${choices.join(' / ')}` };
    }
    return { raw, valid: true, converted: match }; // exact case from definition
  }

  // ── checkbox — pipe separated ──
  if (type === 'checkbox') {
    const choices = getChoices(templateEl);
    if (choices.length) {
      const parts = value.split('|').map(p => p.trim());
      const invalid = parts.filter(p => !choices.find(c => c.toLowerCase() === p.toLowerCase()));
      if (invalid.length) {
        return { raw, valid: false, error: `Unknown: ${invalid.join(', ')}` };
      }
      const converted = parts.map(p => choices.find(c => c.toLowerCase() === p.toLowerCase()) ?? p);
      return { raw, valid: true, converted };
    }
    return { raw, valid: true, converted: value.split('|').map(p => p.trim()) };
  }

  // ── text with regex validators ──
  if (type === 'text' || type === 'comment') {
    const validators: any[] = templateEl?.validators ?? [];
    for (const v of validators) {
      if (v.regex) {
        try {
          if (!new RegExp(v.regex).test(value)) {
            return { raw, valid: false, error: v.text ?? 'Invalid format' };
          }
        } catch { /* invalid regex — skip */ }
      }
    }
    return { raw, valid: true, converted: value };
  }

  return { raw, valid: true, converted: value };
}

// ── CSV / plain-text parser ───────────────────────────────────────────────────
//
// Header row is OPTIONAL.
// If the first row values match the configured column names → treated as header, skipped.
// Otherwise all rows are treated as data, columns assigned by position.

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur);
    return result;
  };

  const firstRow = parseRow(lines[0]).map(h => h.trim());
  const dataRows = lines.slice(1).map(l => parseRow(l));
  return { headers: firstRow, rows: dataRows };
}

// Resolves column order from parsed headers vs configured fields.
// If header row was detected → map by name.
// If no header row → assume positional order matching bulkImportFields order.
function resolveColumnMap(
  parsedHeaders: string[],
  bulkFields: BulkImportField[]
): { columnMap: Record<string, number>; hasHeader: boolean } {
  const configuredNames = bulkFields.map(f => f.name.toLowerCase());
  const firstRowLower   = parsedHeaders.map(h => h.toLowerCase());

  // Check if first row looks like a header (at least half the field names match)
  const matches = firstRowLower.filter(h => configuredNames.includes(h)).length;
  const hasHeader = matches >= Math.ceil(configuredNames.length / 2);

  const columnMap: Record<string, number> = {};

  if (hasHeader) {
    // Map by name from header row
    bulkFields.forEach(f => {
      const idx = firstRowLower.indexOf(f.name.toLowerCase());
      if (idx >= 0) columnMap[f.name] = idx;
    });
  } else {
    // Positional: first configured field → col 0, second → col 1, etc.
    bulkFields.forEach((f, i) => { columnMap[f.name] = i; });
  }

  return { columnMap, hasHeader };
}

// ── Template CSV generator ────────────────────────────────────────────────────

function generateTemplateCSV(config: BulkPanelConfig): string {
  const fields = config.bulkImportFields;
  const templateEls = config.templateElements;

  const headers = fields.map(f => f.name).join(',');

  const exampleRow = fields.map(f => {
    const el = templateEls.find((t: any) => t.name === f.name);
    if (!el) return 'value';
    const type = el.type ?? 'text';

    if (type === 'boolean') return 'yes';
    if (type === 'dropdown' || type === 'radiogroup') {
      const choices = getChoices(el);
      return choices[0] ?? 'option';
    }
    if (type === 'checkbox') {
      const choices = getChoices(el);
      return choices[0] ?? 'option';
    }

    // detect by validator regex
    const validators: any[] = el.validators ?? [];
    for (const v of validators) {
      if (v.regex?.includes('/(?:[0-9]|[12]')) return '10.0.0.0/24'; // CIDR
      if (v.regex?.includes('{3}(?:25[0-5]'))  return '192.168.1.1'; // IPv4
      if (v.regex?.includes('@'))               return 'user@example.com';
    }

    return 'value';
  }).join(',');

  return `${headers}\n${exampleRow}\n`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NetworkImporter({ surveyModel, config }: Props) {
  const [open, setOpen]         = useState(false);
  const [text, setText]         = useState('');
  const [rows, setRows]         = useState<RowResult[]>([]);
  const [parseError, setParseError] = useState('');
  const [imported, setImported] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { bulkImportFields, templateElements } = config;

  const processText = useCallback((raw: string) => {
    setImported(false);
    if (!raw.trim()) { setRows([]); setParseError(''); return; }

    const { headers: firstRow, rows: csvRows } = parseCSV(raw);
    if (!firstRow.length) { setParseError('Could not parse input.'); return; }

    const { columnMap, hasHeader } = resolveColumnMap(firstRow, bulkImportFields);

    // If hasHeader → data starts from csvRows (lines after first).
    // If no header  → firstRow IS the first data row, prepend it back.
    const dataRows = hasHeader ? csvRows : [firstRow, ...csvRows];

    // Check required columns are mappable
    const missing = bulkImportFields
      .filter(f => f.required)
      .filter(f => columnMap[f.name] === undefined);

    if (missing.length) {
      setParseError(`Cannot map required columns: ${missing.map(f => f.name).join(', ')}. Check column order or add a header row.`);
      return;
    }

    setParseError('');

    const parsed: RowResult[] = dataRows.map((cells, i) => {
      const rowCells: Record<string, CellResult> = {};
      let rowValid = true;

      for (const field of bulkImportFields) {
        const colIdx = columnMap[field.name] ?? -1;
        const raw = colIdx >= 0 ? (cells[colIdx] ?? '') : '';
        const templateEl = templateElements.find((t: any) => t.name === field.name);
        const cell = validateCell(raw, templateEl, field.required);
        rowCells[field.name] = cell;
        if (!cell.valid) rowValid = false;
      }

      return { rowNum: i + 1, cells: rowCells, valid: rowValid };
    });

    setRows(parsed);
  }, [bulkImportFields, templateElements]);

  const handleTextChange = (val: string) => {
    setText(val);
    processText(val);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string ?? '';
      setText(content);
      processText(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDownloadTemplate = () => {
    const csv = generateTemplateCSV(config);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.questionName}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const handleImport = () => {
    if (!validRows.length) return;

    const question = surveyModel.getQuestionByName(config.questionName) as any;
    if (!question) return;

    // Build panel value objects from valid rows only
    const panels = validRows.map(row => {
      const panel: Record<string, any> = {};
      for (const field of bulkImportFields) {
        const cell = row.cells[field.name];
        if (cell?.valid) {
          panel[field.name] = cell.converted ?? cell.raw;
        }
      }
      return panel;
    });

    question.value = panels;
    setImported(true);
  };

  const handleClear = () => {
    setText('');
    setRows([]);
    setParseError('');
    setImported(false);
  };

  return (
    <div className={`ni-wrapper ${open ? 'ni-wrapper--open' : ''}`}>
      <button className="ni-toggle" onClick={() => setOpen(v => !v)} type="button">
        <span className="ni-toggle__icon">📥</span>
        <span className="ni-toggle__label">
          Bulk Import — {config.questionName}
        </span>
        {imported && (
          <span className="ni-badge ni-badge--success">✓ {validRows.length} imported</span>
        )}
        {!imported && rows.length > 0 && (
          <span className="ni-badge ni-badge--pending">{rows.length} rows</span>
        )}
        <span className="ni-toggle__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ni-panel">

          {/* Column tags */}
          <div className="ni-columns">
            <span className="ni-columns__label">Columns (in order):</span>
            {bulkImportFields.map((f, i) => (
              <span
                key={f.name}
                className={`ni-col-tag ${f.required ? 'ni-col-tag--required' : ''}`}
              >
                {i + 1}. {f.name}
              </span>
            ))}
          </div>

          <p className="ni-hint">
            Paste values directly — no header needed. Columns must follow the order above.
            If your file has a header row it will be auto-detected and skipped.
            Download the template below to get started.
          </p>

          {/* Template download */}
          <div className="ni-template-row">
            <span>Don't have a file yet?</span>
            <button className="ni-btn ni-btn--template" type="button" onClick={handleDownloadTemplate}>
              ⬇ Download CSV template
            </button>
          </div>

          {/* Input row */}
          <div className="ni-input-row">
            <div
              className={`ni-drop-zone ${dragOver ? 'ni-drop-zone--active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <textarea
                className="ni-textarea"
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`Paste values directly — one row per line:\n\n${bulkImportFields.map(() => 'value').join(',')}\n${bulkImportFields.map(() => 'value').join(',')}\n\nColumns: ${bulkImportFields.map(f => f.name).join(', ')}`}
                rows={5}
                spellCheck={false}
              />
              {dragOver && <div className="ni-drop-overlay">Drop .csv / .txt here</div>}
            </div>

            <div className="ni-actions">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv,.text"
                className="ni-file-hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
              <button className="ni-btn ni-btn--file" type="button" onClick={() => fileRef.current?.click()}>
                📁 Upload
              </button>
              <button className="ni-btn ni-btn--clear" type="button" onClick={handleClear} disabled={!text}>
                🗑 Clear
              </button>
            </div>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="ni-footer" style={{ marginBottom: 'var(--sp-3)' }}>
              <p className="ni-footer__note ni-footer__note--error">❌ {parseError}</p>
            </div>
          )}

          {/* Stats */}
          {rows.length > 0 && !parseError && (
            <div className="ni-stats">
              <span className="ni-stat ni-stat--total">{rows.length} rows</span>
              <span className="ni-stat ni-stat--valid">✅ {validRows.length} valid</span>
              {invalidRows.length > 0 && (
                <span className="ni-stat ni-stat--invalid">❌ {invalidRows.length} errors</span>
              )}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && !parseError && (
            <div className="ni-preview">
              <table className="ni-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {bulkImportFields.map(f => <th key={f.name}>{f.name}{f.required ? ' *' : ''}</th>)}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.rowNum} className={row.valid ? 'ni-row--valid' : 'ni-row--invalid'}>
                      <td className="ni-row__num">{row.rowNum}</td>
                      {bulkImportFields.map(f => {
                        const cell = row.cells[f.name];
                        return (
                          <td key={f.name} className={`ni-cell ${!cell?.valid ? 'ni-cell--err' : ''}`}>
                            <code>{cell?.raw || <em>empty</em>}</code>
                            {!cell?.valid && cell?.error && (
                              <span className="ni-cell-error">{cell.error}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="ni-row__status">
                        {row.valid
                          ? <span className="ni-ok">✓</span>
                          : <span className="ni-err">✕</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Import footer */}
          {validRows.length > 0 && !parseError && (
            <div className="ni-footer">
              {invalidRows.length > 0 && (
                <p className="ni-footer__note">
                  ⚠️ {invalidRows.length} invalid row{invalidRows.length > 1 ? 's' : ''} will be skipped.
                </p>
              )}
              <button
                className={`ni-btn ni-btn--import ${imported ? 'ni-btn--imported' : ''}`}
                type="button"
                onClick={handleImport}
              >
                {imported
                  ? `✓ Imported ${validRows.length} rows`
                  : `Import ${validRows.length} valid row${validRows.length > 1 ? 's' : ''} →`
                }
              </button>
            </div>
          )}

          {rows.length > 0 && validRows.length === 0 && !parseError && (
            <div className="ni-footer">
              <p className="ni-footer__note ni-footer__note--error">
                ❌ No valid rows. Check format — columns must match exactly: {bulkImportFields.map(f => f.name).join(', ')}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}