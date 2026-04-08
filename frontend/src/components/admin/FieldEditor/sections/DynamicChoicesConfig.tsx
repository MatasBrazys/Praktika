// src/components/admin/FieldEditor/sections/DynamicChoicesConfig.tsx
// Shows when a dropdown/radiogroup has "Dynamic choices" enabled.
// Admin picks a source field (paneldynamic or checkbox) and optionally a sub-field.

import type { FieldConfig, DynamicChoicesSource } from '../../../../types/form-builder.types'

interface Props {
  _source: DynamicChoicesSource | undefined
  allFields: FieldConfig[]             // all fields in the entire form (all pages)
  onChange: (source: DynamicChoicesSource | undefined) => void
}

export default function DynamicChoicesConfig({ _source, allFields, onChange }: Props) {
  // Only paneldynamic and checkbox can serve as choice sources
  const sourceFields = allFields.filter(f =>
    f.type === 'paneldynamic' || f.type === 'checkbox'
  )

  const selectedSource = sourceFields.find(f => f.name === _source?.fieldName)
  const isPaneldynamic = selectedSource?.type === 'paneldynamic'
  const subFields = selectedSource?.templateElements ?? []

  const handleToggle = (enabled: boolean) => {
    if (enabled && sourceFields.length > 0) {
      const first = sourceFields[0]
      const firstSub = first.type === 'paneldynamic' ? first.templateElements?.[0]?.name : undefined
      onChange({ fieldName: first.name, subFieldName: firstSub })
    } else {
      onChange(undefined)
    }
  }

  const handleSourceChange = (fieldName: string) => {
    const field = sourceFields.find(f => f.name === fieldName)
    if (!field) return
    const subFieldName = field.type === 'paneldynamic' ? field.templateElements?.[0]?.name : undefined
    onChange({ fieldName, subFieldName })
  }

  const handleSubFieldChange = (subFieldName: string) => {
    if (!_source) return
    onChange({ ..._source, subFieldName })
  }

  const isEnabled = !!_source?.fieldName

  return (
    <div className="dynamic-choices-config">
      <label className="dynamic-choices-toggle">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={e => handleToggle(e.target.checked)}
          disabled={sourceFields.length === 0}
        />
        <span>Dynamic choices from another field</span>
      </label>

      {sourceFields.length === 0 && (
        <small className="dynamic-choices-hint">
          Add a paneldynamic or checkbox field first to use as a choices source.
        </small>
      )}

       {isEnabled && _source && (
          <div className="dynamic-choices-selectors">
           <div className="form-group">
             <label>Source field</label>
             <select value={_source?.fieldName ?? ''} onChange={e => handleSourceChange(e.target.value)}>
               {sourceFields.map(f => (
                 <option key={f.name} value={f.name}>
                   {f.title} ({f.type === 'paneldynamic' ? '🔁 Group' : '☑️ Checkbox'})
                 </option>
               ))}
             </select>
             <small>
               {isPaneldynamic
                 ? 'Choices will be collected from all rows of this repeatable group.'
                 : 'Choices will be the selected checkbox values.'}
             </small>
           </div>

           {isPaneldynamic && subFields.length > 0 && (
             <div className="form-group">
               <label>Sub-field to use as choices</label>
               <select
                 value={_source?.subFieldName ?? ''}
                 onChange={e => handleSubFieldChange(e.target.value)}
               >
                 {subFields.map(sf => (
                   <option key={sf.name} value={sf.name}>
                     {sf.title} ({sf.name})
                   </option>
                 ))}
               </select>
               <small>
                 Values from this column across all rows will appear as dropdown options.
               </small>
             </div>
           )}

           <div className="dynamic-choices-preview">
             <strong>Runtime behavior:</strong>
             <p>
               {isPaneldynamic
                 ? `When user fills rows in "${selectedSource?.title}", the values from "${_source?.subFieldName}" column will appear as choices in this dropdown.`
                 : `When user checks items in "${selectedSource?.title}", those selected values will appear as choices in this dropdown.`}
             </p>
           </div>
         </div>
      )}
    </div>
  )
}