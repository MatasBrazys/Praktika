// src/components/admin/FieldEditor/sections/LookupFieldConfig.tsx
// Admin picks a lookup config → sees field mappings preview.
// Stores lookupConfigId and lookupFieldMappings on the FieldConfig.
// Detects when the config's field_mappings have changed since the form was last saved,
// and offers a one-click re-sync so the admin doesn't have to manually redo the config.

import { useState, useEffect } from 'react'
import { lookupAPI } from '../../../../services/api'
import type { LookupConfigResponse } from '../../../../services/api'
import type { FieldConfig } from '../../../../types/form-builder.types'

interface Props {
  config: FieldConfig
  onConfigChange: (updates: Partial<FieldConfig>) => void
}

export default function LookupFieldConfig({ config, onConfigChange }: Props) {
  const [configs, setConfigs] = useState<LookupConfigResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    lookupAPI.listActiveConfigs()
      .then(setConfigs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Check if the stored field_mappings are out of sync with the current config
  useEffect(() => {
    if (!config.lookupConfigId || !configs.length) return
    const currentCfg = configs.find(c => c.id === config.lookupConfigId)
    if (!currentCfg) return
    const storedKeys = (config.lookupFieldMappings ?? []).map(m => m.key).sort().join(',')
    const currentKeys = currentCfg.field_mappings.map(m => m.key).sort().join(',')
    setIsStale(storedKeys !== currentKeys)
  }, [configs, config.lookupConfigId, config.lookupFieldMappings])

  const selected = configs.find(c => c.id === config.lookupConfigId)

  const handleConfigSelect = (idStr: string) => {
    const id = parseInt(idStr)
    const cfg = configs.find(c => c.id === id)
    if (!cfg) {
      onConfigChange({ lookupConfigId: undefined, lookupFieldMappings: undefined })
      return
    }
    onConfigChange({
      lookupConfigId: cfg.id,
      lookupFieldMappings: cfg.field_mappings.map(m => ({ key: m.key, label: m.label })),
    })
    setIsStale(false)
  }

  const handleResync = () => {
    if (!selected) return
    onConfigChange({
      lookupFieldMappings: selected.field_mappings.map(m => ({ key: m.key, label: m.label })),
    })
    setIsStale(false)
  }

  if (loading) return <p>Loading lookup configs…</p>

  if (!configs.length) {
    return (
      <div className="crm-section">
        <h3>🔍 Lookup Configuration</h3>
        <p>No active lookup configs found. Create one in <strong>Admin → Lookup Configs</strong> first.</p>
      </div>
    )
  }

  return (
    <div className="crm-section">
      <h3>🔍 Lookup Configuration</h3>
      <p>Select an API config. When a user searches, matched fields will auto-fill.</p>

      {isStale && (
        <div
          className="info-box"
          style={{ borderColor: 'var(--amber-200)', background: 'var(--amber-50)', color: 'var(--amber-800)' }}
        >
          <p>⚠️ This config's fields have changed since the form was last saved.</p>
          <button
            className="btn-primary"
            style={{ marginTop: 'var(--sp-2)' }}
            onClick={handleResync}
            type="button"
          >
            Re-sync fields
          </button>
        </div>
      )}

      <div className="form-group">
        <label>Lookup Config *</label>
        <select
          value={config.lookupConfigId ?? ''}
          onChange={e => handleConfigSelect(e.target.value)}
        >
          <option value="">Select config…</option>
          {configs.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.description || c.base_url}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Description / Help text</label>
        <input
          type="text"
          value={config.description || ''}
          onChange={e => onConfigChange({ description: e.target.value })}
          placeholder="e.g., Search for a device by name"
        />
      </div>

      <div className="form-group">
        <label>Search Placeholder</label>
        <input
          type="text"
          value={config.placeholder || ''}
          onChange={e => onConfigChange({ placeholder: e.target.value })}
          placeholder="e.g., Type device name…"
        />
      </div>

      {selected && (
        <div className="crm-field-names">
          <strong>Auto-fill fields from API:</strong>
          <ul>
            <li><code>{config.name || 'lookup_id'}</code> — Search input</li>
            {(config.lookupFieldMappings ?? []).map((m, i) => (
              <li key={i}>
                <code>{config.name || 'lookup_id'}_{m.key.replace(/\./g, '_')}</code> — {m.label}
              </li>
            ))}
          </ul>
          <small>
            API: {selected.search_method} {selected.base_url}{selected.search_endpoint}
          </small>
        </div>
      )}
    </div>
  )
}
