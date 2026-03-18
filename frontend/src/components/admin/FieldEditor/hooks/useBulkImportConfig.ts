// src/components/admin/FieldEditor/hooks/useBulkImportConfig.ts
// Manages the bulk import configuration for paneldynamic fields.
// Extracted from FieldEditor/index.tsx.

import { useState } from 'react'
import type { BulkImportField, FieldConfig } from '../../../../types/form-builder.types'

export function useBulkImportConfig(
  initialEnabled: boolean,
  initialFields: BulkImportField[],
  getTemplateFields: () => FieldConfig[],
) {
  const [allowBulkImport,  setAllowBulkImport]  = useState(initialEnabled)
  const [bulkImportFields, setBulkImportFields]  = useState<BulkImportField[]>(initialFields)

  const handleBulkImportToggle = (enabled: boolean) => {
    setAllowBulkImport(enabled)
    if (enabled && !bulkImportFields.length) {
      setBulkImportFields(getTemplateFields().map(tf => ({ name: tf.name, required: false })))
    }
  }

  const handleBulkFieldToggle = (fieldName: string, included: boolean) =>
    setBulkImportFields(prev =>
      included ? [...prev, { name: fieldName, required: false }] : prev.filter(b => b.name !== fieldName)
    )

  const handleBulkRequiredToggle = (fieldName: string, required: boolean) =>
    setBulkImportFields(prev => prev.map(b => b.name === fieldName ? { ...b, required } : b))

  return {
    allowBulkImport,
    bulkImportFields,
    handleBulkImportToggle,
    handleBulkFieldToggle,
    handleBulkRequiredToggle,
  }
}