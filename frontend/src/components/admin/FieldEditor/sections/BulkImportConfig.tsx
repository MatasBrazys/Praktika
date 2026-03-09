// src/components/admin/FieldEditor/sections/BulkImportConfig.tsx
// Bulk import config section — toggle CSV import and configure which fields are included.

import type { BulkImportField, FieldConfig } from '../../../../types/form-builder.types';

interface Props {
  templateFields:   FieldConfig[];
  allowBulkImport:  boolean;
  bulkImportFields: BulkImportField[];
  onToggle:         (enabled: boolean) => void;
  onFieldToggle:    (fieldName: string, included: boolean) => void;
  onRequiredToggle: (fieldName: string, required: boolean) => void;
}

export default function BulkImportConfig({
  templateFields, allowBulkImport, bulkImportFields, onToggle, onFieldToggle, onRequiredToggle,
}: Props) {
  return (
    <div className="bulk-import-config">
      <div className="bulk-import-toggle-row">
        <label>
          <input
            type="checkbox"
            checked={allowBulkImport}
            onChange={e => onToggle(e.target.checked)}
          />
          📥 Enable bulk CSV import for this group
        </label>
      </div>

      {allowBulkImport && (
        <>
          {templateFields.length === 0 ? (
            <div className="bulk-empty">Add fields above first, then configure bulk import.</div>
          ) : (
            <table className="bulk-fields-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th className="bulk-col-center">Include in CSV</th>
                  <th className="bulk-col-center">Required</th>
                </tr>
              </thead>
              <tbody>
                {templateFields.map(tf => {
                  const bulkEntry = bulkImportFields.find(b => b.name === tf.name);
                  const isIncluded = !!bulkEntry;
                  const isRequired = bulkEntry?.required ?? false;

                  return (
                    <tr key={tf.id}>
                      <td>
                        <strong>{tf.title}</strong>
                        <code className="bulk-field-name">{tf.name}</code>
                      </td>
                      <td>{tf.type}{tf.inputType ? ` / ${tf.inputType}` : ''}</td>
                      <td className="bulk-col-center">
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={e => onFieldToggle(tf.name, e.target.checked)}
                        />
                      </td>
                      <td className="bulk-col-center">
                        <input
                          type="checkbox"
                          checked={isRequired}
                          disabled={!isIncluded}
                          onChange={e => onRequiredToggle(tf.name, e.target.checked)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <small className="bulk-import-hint">
            "Required" means that column must be filled in the CSV. Unchecked fields stay out of the CSV and are filled manually.
          </small>
        </>
      )}
    </div>
  );
}