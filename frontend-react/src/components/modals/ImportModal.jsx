import { useState, useEffect } from 'react'
import { bulkTickets } from '../../api'
import { repairJSON } from '../../utils'

export default function ImportModal({ initialText = '', onClose, showToast, refreshData }) {
  const [jsonText, setJsonText] = useState(initialText)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    if (initialText) setJsonText(initialText)
  }, [initialText])

  async function handleSubmit() {
    let data
    try {
      data = repairJSON(jsonText)
      if (!data) throw new Error('Could not parse JSON')
      if (!Array.isArray(data)) data = [data]
    } catch (err) {
      alert('Could not parse data. Ensure you pasted a valid JSON object/array or CSV-converted text.')
      return
    }

    setProgress(10)
    setStatusMsg(`Connecting to analysis engine for ${data.length} items...`)
    setLoading(true)

    try {
      const result = await bulkTickets(data)
      setProgress(100)
      setStatusMsg(`Successfully processed ${result.processed} tickets.`)
      setTimeout(() => {
        onClose()
        setProgress(0)
        setStatusMsg('')
        setLoading(false)
        setJsonText('')
        refreshData()
        showToast(`Bulk Import Complete: ${result.processed} tickets added.`)
      }, 1500)
    } catch (err) {
      setStatusMsg('Network error during processing.')
      setLoading(false)
    }
  }

  return (
    <div id="import-modal" className="modal active" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}>
      <div className="modal-content import-modal-light" style={{ width: '700px', background: 'white', borderRadius: '28px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: 0 }}>Bulk Import Tickets</h2>
          <button className="close-btn-minimal" onClick={onClose} disabled={loading} style={{ fontSize: '30px', color: '#cbd5e1' }}>×</button>
        </div>

        <div id="import-paste-area" className="import-section active">
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#64748b', marginBottom: '10px' }}>Paste JSON / CSV Data</label>
            <textarea
              id="bulk-json-input"
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder={`Paste your support data here...\n\nExample:\n[\n  {\n    "problem": "Sensor offline on Line 5",\n    "customer_email": "ops@company.com"\n  }\n]`}
              rows={12}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '19px', fontFamily: 'monospace', outline: 'none', color: '#1e293b', resize: 'vertical' }}
            />
          </div>
        </div>

        {loading && (
          <div id="bulk-import-progress" style={{ marginBottom: '24px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <div className="progress-bar-container" style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                id="bulk-progress-fill"
                className="progress-bar-fill"
                style={{ width: `${progress}%`, height: '100%', background: '#668f45', transition: 'width 0.3s ease' }}
              />
            </div>
            <p id="bulk-status-text" style={{ fontSize: '19px', color: '#64748b', marginTop: '12px', fontWeight: 600, textAlign: 'center' }}>
              {statusMsg}
            </p>
          </div>
        )}

        <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button
            id="btn-submit-bulk"
            onClick={handleSubmit}
            disabled={loading || !String(jsonText || '').trim()}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#668f45', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(102, 143, 69, 0.2)' }}
          >
            {loading ? 'Processing Data...' : '🚀 Process Analysis'}
          </button>
        </div>
      </div>
    </div>
  )
}
