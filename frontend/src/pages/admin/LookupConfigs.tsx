// src/pages/admin/LookupConfigs.tsx
// Admin page to manage external API lookup configurations.
// Modal editor with Discover Fields auto-detection.
//
// Simplified: Value Field (hardcoded "id") and Display Field (auto from first mapping)
// are no longer exposed in UI — they caused confusion without adding value.

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { extractErrorMessage } from '../../lib/apiClient'
import { lookupAPI } from '../../services/api'
import type { LookupConfigResponse, LookupFieldMapping } from '../../services/api'
import '../../styles/pages/admin/form-list.css'
import '../../styles/components/field-editor.css'
import '../../styles/components/modal.css'
import '../../styles/pages/admin/lookup-configs.css'

// ── Types ─────────────────────────────────────────────────────────────────

interface ConfigForm {
  name: string
  description: string
  base_url: string
  search_endpoint: string
  search_method: string
  auth_type: string
  auth_token: string
  auth_header_name: string
  results_path: string
  test_query: string
  field_mappings: LookupFieldMapping[]
}

interface DiscoveredField {
  path: string
  sample_value: string
  type: string
  selected: boolean
}

const EMPTY_FORM: ConfigForm = {
  name: '',
  description: '',
  base_url: '',
  search_endpoint: '',
  search_method: 'GET',
  auth_type: 'none',
  auth_token: '',
  auth_header_name: '',
  results_path: '',
  test_query: '',
  field_mappings: [],
}

function pathToLabel(path: string): string {
  return path
    .split('.')
    .pop()!
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function LookupConfigs() {
  const { toast } = useToast()

  const [configs, setConfigs] = useState<LookupConfigResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ConfigForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<number | null>(null)

  const [discoveredFields, setDiscoveredFields] = useState<DiscoveredField[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true)
      setConfigs(await lookupAPI.listConfigs())
    } catch (err) {
      toast.error('Failed to load configs', extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadConfigs() }, [loadConfigs])

  // ── Modal handlers ────────────────────────────────────────────────────

  const openCreate = () => { setForm(EMPTY_FORM); setCreating(true); setEditing(null); resetDiscover() }

  const openEdit = (config: LookupConfigResponse) => {
    setForm({
      name: config.name,
      description: config.description ?? '',
      base_url: config.base_url,
      search_endpoint: config.search_endpoint,
      search_method: config.search_method,
      auth_type: config.auth_type,
      auth_token: '',
      auth_header_name: config.auth_header_name ?? '',
      results_path: config.results_path ?? '',
      test_query: config.test_query ?? '',
      field_mappings: config.field_mappings ?? [],
    })
    setEditing(config.id)
    setCreating(false)
    resetDiscover()
  }

  const closeModal = () => { setEditing(null); setCreating(false); resetDiscover() }
  const resetDiscover = () => { setDiscoveredFields([]); setShowDiscover(false); setDiscovering(false) }

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { toast.warning('Name required'); return }
    if (!form.base_url.trim()) { toast.warning('Base URL required'); return }
    if (!form.search_endpoint.includes('{query}')) {
      toast.warning('Missing {query}', 'Search endpoint must contain {query} placeholder — this is where the user\'s search text goes.')
      return
    }

    setSaving(true)
    try {
      // Auto-set display_field from first mapping, value_field always "id"
      const payload: any = {
        ...form,
        value_field: 'id',
        display_field: form.field_mappings[0]?.key || 'name',
      }
      if (editing && !payload.auth_token) delete payload.auth_token

      if (creating) {
        await lookupAPI.createConfig(payload)
        toast.success('Config created', `"${form.name}" has been saved.`)
      } else if (editing) {
        await lookupAPI.updateConfig(editing, payload)
        toast.success('Config updated', `"${form.name}" has been saved.`)
      }

      closeModal()
      await loadConfigs()
    } catch (err) {
      toast.error('Save failed', extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Card actions ──────────────────────────────────────────────────────

  const handleDelete = async (config: LookupConfigResponse) => {
    if (!confirm(`Delete "${config.name}"? This cannot be undone.`)) return
    try {
      await lookupAPI.deleteConfig(config.id)
      toast.success('Config deleted', `"${config.name}" has been removed.`)
      await loadConfigs()
    } catch (err) {
      toast.error('Delete failed', extractErrorMessage(err))
    }
  }

  const handleTest = async (id: number) => {
    setTesting(id)
    try {
      const result = await lookupAPI.testConfig(id)
      if (result.success) toast.success('Connection OK', `Found ${result.sample_count ?? 0} sample results.`)
      else toast.error('Connection failed', result.error ?? 'Unknown error')
    } catch (err) {
      toast.error('Test failed', extractErrorMessage(err))
    } finally {
      setTesting(null)
    }
  }

  const handleToggle = async (config: LookupConfigResponse) => {
    try {
      await lookupAPI.updateConfig(config.id, { is_active: !config.is_active })
      await loadConfigs()
      toast.success(config.is_active ? 'Disabled' : 'Enabled', `"${config.name}" updated.`)
    } catch (err) {
      toast.error('Update failed', extractErrorMessage(err))
    }
  }

  // ── Discover fields ───────────────────────────────────────────────────

  const handleDiscover = async () => {
    if (!editing) { toast.warning('Save first', 'Save the config before discovering fields.'); return }
    setDiscovering(true)
    try {
      const result = await lookupAPI.discoverFields(editing)
      if (result.error) { toast.error('Discovery failed', result.error); return }
      if (!result.fields.length) { toast.warning('No fields', 'No fields found in API response.'); return }

      const existingKeys = new Set(form.field_mappings.map(m => m.key))
      setDiscoveredFields(
        result.fields
          .filter(f => f.type !== 'array' && f.type !== 'object')
          .map(f => ({ ...f, selected: existingKeys.has(f.path) }))
      )
      setShowDiscover(true)
    } catch (err) {
      toast.error('Discovery failed', extractErrorMessage(err))
    } finally {
      setDiscovering(false)
    }
  }

  const toggleDiscoveredField = (path: string) => {
    setDiscoveredFields(prev => prev.map(f => f.path === path ? { ...f, selected: !f.selected } : f))
  }

  const applyDiscoveredFields = () => {
    const selected = discoveredFields.filter(f => f.selected)
    const existingKeys = new Set(form.field_mappings.map(m => m.key))
    const selectedKeys = new Set(selected.map(f => f.path))

    const newMappings = [
      ...form.field_mappings.filter((m: LookupFieldMapping) =>
        selectedKeys.has(m.key) || !discoveredFields.some((d: DiscoveredField) => d.path === m.key)
      ),
      ...selected
        .filter(f => !existingKeys.has(f.path))
        .map(f => ({ key: f.path, label: pathToLabel(f.path) })),
    ]

    setForm(prev => ({ ...prev, field_mappings: newMappings }))
    setShowDiscover(false)
    toast.success('Fields applied', `${selected.length} field${selected.length !== 1 ? 's' : ''} mapped.`)
  }

  // ── Manual field mappings ─────────────────────────────────────────────

  const addMapping = () => setForm(p => ({ ...p, field_mappings: [...p.field_mappings, { key: '', label: '' }] }))
  const updateMapping = (i: number, u: Partial<LookupFieldMapping>) => setForm(p => ({ ...p, field_mappings: p.field_mappings.map((m, idx) => idx === i ? { ...m, ...u } : m) }))
  const deleteMapping = (i: number) => setForm(p => ({ ...p, field_mappings: p.field_mappings.filter((_, idx) => idx !== i) }))

  const isModalOpen = creating || editing !== null

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="page-loading"><div className="spinner" />Loading configs…</div>
  )

  return (
    <>
      
      <div className="page-container-admin">
        <div className="form-list-wrapper">

          <div className="page-header">
            <div>
              <h1>Lookup Configurations</h1>
              <p className="subtitle">External API connections for form auto-fill</p>
            </div>
            <button className="btn-create" onClick={openCreate}>+ New Config</button>
          </div>

          {/* ── Config list ── */}
          {configs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔗</div>
              <h2>No lookup configs</h2>
              <p>Create a config to connect forms with external APIs</p>
              <button className="btn-create" onClick={openCreate}>Create First Config</button>
            </div>
          ) : (
            <div className="lookup-list">
              {configs.map(config => (
                <div key={config.id} className={`lookup-card ${!config.is_active ? 'lookup-card--inactive' : ''}`}>
                  <div className="lookup-card__header">
                    <div>
                      <h3>{config.name}</h3>
                      {config.description && <p>{config.description}</p>}
                    </div>
                    <span className={`status ${config.is_active ? 'active' : 'inactive'}`}>
                      {config.is_active ? ' Active' : ' Inactive'}
                    </span>
                  </div>

                  <div className="lookup-card__meta">
                    <code>{config.search_method} {config.base_url}{config.search_endpoint}</code>
                    <span>Auth: {config.auth_type}{config.has_token ? ' ✓' : ''}</span>
                    <span>{config.field_mappings.length} mapping{config.field_mappings.length !== 1 ? 's' : ''}</span>
                  </div>

                  {config.field_mappings.length > 0 && (
                    <div className="lookup-card__tags">
                      {config.field_mappings.map((m, i) => (
                        <span key={i} className="lookup-tag"><code>{m.key}</code> → {m.label}</span>
                      ))}
                    </div>
                  )}

                  <div className="card-actions" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <button className="btn-edit" onClick={() => openEdit(config)}>Edit</button>
                    <button className="btn-view" onClick={() => handleTest(config.id)} disabled={testing === config.id}>
                      {testing === config.id ? 'Testing…' : 'Test'}
                    </button>
                    <button className={`btn-toggle ${config.is_active ? '' : 'activate'}`} onClick={() => handleToggle(config)}>
                      {config.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(config)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal editor ── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2>{creating ? 'Create Lookup Config' : 'Edit Lookup Config'}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">

              <div className="form-row">
                <div className="form-group">
                  <label>Config Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Netbox Devices, CRM Clients" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What this lookup does" />
                </div>
              </div>

              <h3 className="lookup-section-title">API Connection</h3>

              <div className="form-group">
                <label>Base URL *</label>
                <input type="text" value={form.base_url} onChange={e => setForm(p => ({ ...p, base_url: e.target.value }))} placeholder="https://netbox.company.com" />
                <small>The root URL of the external API (no trailing slash).</small>
              </div>

              <div className="form-group">
                <label>Search Endpoint *</label>
                <input type="text" value={form.search_endpoint} onChange={e => setForm(p => ({ ...p, search_endpoint: e.target.value }))} placeholder="/api/tenancy/tenants/?cf_CRM_ID={query}" className="code-input" />
                <small>
                  <code className="lookup-hint">{'{query}'}</code> = what the user types in the form.
                  This controls <strong>which field</strong> the API searches by. Examples:
                  <br />• Search by CRM ID: <code>/api/clients/?crm_id={'{query}'}</code>
                  <br />• Search by name: <code>/api/devices/?name__ic={'{query}'}</code>
                  <br />• Search by IP: <code>/api/prefixes/?prefix={'{query}'}</code>
                </small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>HTTP Method</label>
                  <select value={form.search_method} onChange={e => setForm(p => ({ ...p, search_method: e.target.value }))}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Authentication</label>
                  <select value={form.auth_type} onChange={e => setForm(p => ({ ...p, auth_type: e.target.value }))}>
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="header">Custom Header</option>
                    <option value="basic">Basic Auth (user:pass)</option>
                  </select>
                </div>
                {form.auth_type === 'header' && (
                  <div className="form-group">
                    <label>Header Name</label>
                    <input type="text" value={form.auth_header_name} onChange={e => setForm(p => ({ ...p, auth_header_name: e.target.value }))} placeholder="X-API-Key" />
                  </div>
                )}
              </div>

              {form.auth_type !== 'none' && (
                <div className="form-group">
                  <label>{form.auth_type === 'basic' ? 'Credentials (username:password)' : 'API Token'}</label>
                  <input
                    type="password"
                    value={form.auth_token}
                    onChange={e => setForm(p => ({ ...p, auth_token: e.target.value }))}
                    placeholder={editing ? '(leave empty to keep current token)' : 'Paste your API token here'}
                  />
                  {editing && <small>Leave empty to keep the existing token. Enter a new value to replace it.</small>}
                </div>
              )}

              <div className="form-group">
                <label>Results Path</label>
                <input type="text" value={form.results_path} onChange={e => setForm(p => ({ ...p, results_path: e.target.value }))} placeholder="results" className="code-input" />
                <small>
                  Where the array of results lives in the API response.
                  Netbox uses <code>results</code>. Some APIs use <code>data</code> or <code>data.items</code>.
                  Leave empty if the response itself is the array.
                </small>
              </div>

              <div className="form-group">
                <label>Test Query *</label>
                <input type="text" value={form.test_query} onChange={e => setForm(p => ({ ...p, test_query: e.target.value }))} placeholder="e.g. CRM001" />
                <small>
                  A known valid value used by "Test" and "Discover Fields".
                  Enter something that will return exactly 1 result from your API.
                </small>
              </div>

              <div className="lookup-mappings-header">
                <h3 className="lookup-section-title">Auto-fill Fields</h3>
                {editing && (
                  <button className="btn-discover" onClick={handleDiscover} disabled={discovering}>
                    {discovering ? '🔍 Discovering…' : '🔍 Discover Fields'}
                  </button>
                )}
                {creating && <small className="lookup-discover-note">Save first, then use Discover Fields</small>}
              </div>

              <p className="lookup-mappings-hint">
                When a user searches and gets a match, these fields auto-fill from the API response.
                Use "Discover Fields" to auto-detect available fields, or add them manually.
              </p>

              {/* ── Discover panel ── */}
              {showDiscover && discoveredFields.length > 0 && (
                <div className="discover-panel">
                  <div className="discover-panel__header">
                    <strong>Select fields to auto-fill:</strong>
                    <span>{discoveredFields.filter(f => f.selected).length} selected</span>
                  </div>
                  <div className="discover-panel__list">
                    {discoveredFields.map(f => (
                      <label key={f.path} className={`discover-field ${f.selected ? 'discover-field--selected' : ''}`}>
                        <input type="checkbox" checked={f.selected} onChange={() => toggleDiscoveredField(f.path)} />
                        <code>{f.path}</code>
                        <span className="discover-field__sample">{f.sample_value || '(empty)'}</span>
                        <span className="discover-field__type">{f.type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="discover-panel__actions">
                    <button className="btn-secondary" onClick={() => setShowDiscover(false)}>Cancel</button>
                    <button className="btn-primary" onClick={applyDiscoveredFields}>
                      Apply {discoveredFields.filter(f => f.selected).length} Fields
                    </button>
                  </div>
                </div>
              )}

              {/* ── Mappings table ── */}
              {!showDiscover && (
                <>
                  {form.field_mappings.length === 0 ? (
                    <div className="empty-template"><p>No fields yet. Use "Discover Fields" or add manually below.</p></div>
                  ) : (
                    <table className="bulk-fields-table">
                      <thead>
                        <tr>
                          <th>API Response Key <code className="lookup-hint">dot.notation for nested</code></th>
                          <th>Form Label (what user sees)</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.field_mappings.map((m, idx) => (
                          <tr key={idx}>
                            <td><input type="text" value={m.key} onChange={e => updateMapping(idx, { key: e.target.value })} placeholder="site.name" className="code-input" /></td>
                            <td><input type="text" value={m.label} onChange={e => updateMapping(idx, { label: e.target.value })} placeholder="Site Name" /></td>
                            <td><button className="btn-delete-small" onClick={() => deleteMapping(idx)}>×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <button className="btn-add-condition" onClick={addMapping}>+ Add Field</button>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : creating ? 'Create Config' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}