import { useState } from 'react'
import { createTicket } from '../../api'

export default function TicketFormModal({ onClose, showToast, refreshData }) {
  const [email, setEmail] = useState('')
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        customer_email: email,
        problem,
        solution: solution || 'No preliminary solution provided.'
      }
      await createTicket(data)
      onClose()
      setEmail(''); setProblem(''); setSolution('')
      await refreshData()
      showToast('Ticket analyzed and saved successfully! 🚀')
    } catch (err) {
      showToast('Error submitting ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="ticket-form-modal" className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content ticket-form-modal-premium">
        <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', margin: 0 }}>Create New Ticket</h2>
          <button className="close-btn-minimal" onClick={onClose} style={{ fontSize: '30px', color: '#cbd5e1' }}>×</button>
        </div>
        <form id="ticket-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '19px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Customer Email</label>
            <input
              type="email"
              id="customer_email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="customer@company.com"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '20px', outline: 'none', color: '#1e293b' }}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '19px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Problem Description</label>
            <textarea
              id="problem"
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="Describe the customer's issue..."
              rows={4}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '20px', outline: 'none', color: '#1e293b', resize: 'vertical' }}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontSize: '19px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Solution / Resolution (optional)</label>
            <textarea
              id="solution"
              value={solution}
              onChange={e => setSolution(e.target.value)}
              placeholder="How was this resolved? (Leave blank if unresolved)"
              rows={3}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '20px', outline: 'none', color: '#1e293b', resize: 'vertical' }}
            />
          </div>
          <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button 
              id="submit-ticket-btn" 
              type="submit" 
              disabled={loading}
              style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#668f45', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(102, 143, 69, 0.2)' }}
            >
              {loading ? 'Processing...' : 'Process with Intelligence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
