// src/components/public/NetworkImporter/index.tsx
// Bulk CSV import UI for paneldynamic fields.
// Parsing, validation and template generation are handled by ./utils/.

import { useState, useRef, useCallback } from 'react'
import type { Model }              from 'survey-core'
import { parseCSV, resolveColumnMap } from './utils/csvParser'
import { validateCell }            from './utils/cellValidator'
import type { CellResult }         from './utils/cellValidator'
import { generateTemplateCSV }     from './utils/templateGenerator'
import { downloadCSV }             from '../../../lib/utils'
import type { BulkPanelConfig }    from '../../../types/survey.types'
import '../../../styles/components/network-importer.css'

// SurveyJS paneldynamic question — only the shape we actually use
interface SurveyPanelQuestion {
  value: Record<string, unknown>[]
}

interface RowResult {
  rowNum: number
  cells:  Record<string, CellResult>
  valid:  boolean
}

interface Props {
  surveyModel: Model
  config:      BulkPanelConfig
}

export default function NetworkImporter({ surveyModel, config }: Props) {
  const [open,       setOpen]       = useState(false)
  const [text,       setText]       = useState('')
  const [rows,       setRows]       = useState<RowResult[]>([])
  const [parseError, setParseError] = useState('')
  const [imported,   setImported]   = useState(false)
  const [dragOver,   setDragOver]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { bulkImportFields, templateElements } = config

  const processText = useCallback((raw: string) => {
    setImported(false)
    if (!raw.trim()) { setRows([]); setParseError(''); return }

    const { headers: firstRow, rows: csvRows } = parseCSV(raw)
    if (!firstRow.length) { setParseError('Could not parse input.'); return }

    const { columnMap, hasHeader } = resolveColumnMap(firstRow, bulkImportFields)

    // If first row was a header, data starts from csvRows; otherwise include firstRow as data
    const dataRows = hasHeader ? csvRows : [firstRow, ...csvRows]

    const missingRequired = bulkImportFields
      .filter(f => f.required)
      .filter(f => columnMap[f.name] === undefined)

    if (missingRequired.length) {
      setParseError(
        `Cannot map required columns: ${missingRequired.map(f => f.name).join(', ')}. ` +
        'Check column order or add a header row.',
      )
      return
    }

    setParseError('')

    const parsed: RowResult[] = dataRows.map((cells, index) => {
      const rowCells: Record<string, CellResult> = {}
      let rowValid = true

      for (const field of bulkImportFields) {
        const colIndex   = columnMap[field.name] ?? -1
        const rawValue   = colIndex >= 0 ? (cells[colIndex] ?? '') : ''
        const templateEl = templateElements.find(t => t.name === field.name)
        const result     = validateCell(rawValue, templateEl, field.required)
        rowCells[field.name] = result
        if (!result.valid) rowValid = false
      }

      return { rowNum: index + 1, cells: rowCells, valid: rowValid }
    })

    setRows(parsed)
  }, [bulkImportFields, templateElements])

  const handleTextChange = (value: string) => {
    setText(value)
    processText(value)
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = (e.target?.result as string) ?? ''
      setText(content)
      processText(content)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDownloadTemplate = () => {
    const csv = generateTemplateCSV(config)
    downloadCSV(csv, `${config.questionName}_template.csv`)
  }

  // Writes validated rows directly into the SurveyJS paneldynamic question
  const handleImport = () => {
    if (!validRows.length) return

    const question = surveyModel.getQuestionByName(config.questionName) as SurveyPanelQuestion | null
    if (!question) return

    question.value = validRows.map(row => {
      const panel: Record<string, unknown> = {}
      for (const field of bulkImportFields) {
        const cell = row.cells[field.name]
        if (cell?.valid) panel[field.name] = cell.converted ?? cell.raw
      }
      return panel
    })

    setImported(true)
  }

  const handleClear = () => {
    setText('')
    setRows([])
    setParseError('')
    setImported(false)
  }

  const validRows   = rows.filter(r => r.valid)
  const invalidRows = rows.filter(r => !r.valid)

  return (
    <div className={`ni-wrapper ${open ? 'ni-wrapper--open' : ''}`}>
      <button className="ni-toggle" onClick={() => setOpen(v => !v)} type="button">
        <span className="ni-toggle__icon">📥</span>
        <span className="ni-toggle__label">Bulk Import — {config.questionName}</span>
        {imported      && <span className="ni-badge ni-badge--success">✓ {validRows.length} imported</span>}
        {!imported && rows.length > 0 && <span className="ni-badge ni-badge--pending">{rows.length} rows</span>}
        <span className="ni-toggle__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ni-panel">

          <div className="ni-columns">
            <span className="ni-columns__label">Columns (in order):</span>
            {bulkImportFields.map((field, index) => (
              <span key={field.name} className={`ni-col-tag ${field.required ? 'ni-col-tag--required' : ''}`}>
                {index + 1}. {field.name}
              </span>
            ))}
          </div>

          <p className="ni-hint">
            Paste values directly — no header needed. Columns must follow the order above.
            If your file has a header row it will be auto-detected and skipped.
          </p>

          <div className="ni-template-row">
            <span>Don't have a file yet?</span>
            <button className="ni-btn ni-btn--template" type="button" onClick={handleDownloadTemplate}>
              ⬇ Download CSV template
            </button>
          </div>

          <div className="ni-input-row">
            <div
              className={`ni-drop-zone ${dragOver ? 'ni-drop-zone--active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <textarea
                className="ni-textarea"
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`Paste values — one row per line:\n\n${bulkImportFields.map(() => 'value').join(',')}`}
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
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
              />
              <button className="ni-btn ni-btn--file"  type="button" onClick={() => fileRef.current?.click()}>📁 Upload</button>
              <button className="ni-btn ni-btn--clear" type="button" onClick={handleClear} disabled={!text}>🗑 Clear</button>
            </div>
          </div>

          {parseError && (
            <div className="ni-footer">
              <p className="ni-footer__note ni-footer__note--error">❌ {parseError}</p>
            </div>
          )}

          {rows.length > 0 && !parseError && (
            <div className="ni-stats">
              <span className="ni-stat ni-stat--total">{rows.length} rows</span>
              <span className="ni-stat ni-stat--valid">✅ {validRows.length} valid</span>
              {invalidRows.length > 0 && <span className="ni-stat ni-stat--invalid">❌ {invalidRows.length} errors</span>}
            </div>
          )}

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
                      {bulkImportFields.map(field => {
                        const cell = row.cells[field.name]
                        return (
                          <td key={field.name} className={`ni-cell ${!cell?.valid ? 'ni-cell--err' : ''}`}>
                            <code>{cell?.raw || <em>empty</em>}</code>
                            {!cell?.valid && cell?.error && <span className="ni-cell-error">{cell.error}</span>}
                          </td>
                        )
                      })}
                      <td className="ni-row__status">
                        {row.valid ? <span className="ni-ok">✓</span> : <span className="ni-err">✕</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {validRows.length > 0 && !parseError && (
            <div className="ni-footer">
              {invalidRows.length > 0 && (
                <p className="ni-footer__note">⚠️ {invalidRows.length} invalid row{invalidRows.length > 1 ? 's' : ''} will be skipped.</p>
              )}
              <button
                className={`ni-btn ni-btn--import ${imported ? 'ni-btn--imported' : ''}`}
                type="button"
                onClick={handleImport}
              >
                {imported
                  ? `✓ Imported ${validRows.length} rows`
                  : `Import ${validRows.length} valid row${validRows.length > 1 ? 's' : ''} →`}
              </button>
            </div>
          )}

          {rows.length > 0 && validRows.length === 0 && !parseError && (
            <div className="ni-footer">
              <p className="ni-footer__note ni-footer__note--error">
                ❌ No valid rows. Columns must match: {bulkImportFields.map(f => f.name).join(', ')}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
