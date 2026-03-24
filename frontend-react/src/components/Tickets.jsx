import { useState } from 'react'
import { deleteTicket, clearTickets } from '../api'

const highlight = (text, q) => {
  if (!q || !text) return text || ''
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

const CAT_COLORS = {
  'Account Access': '#668f45',
  'Sensor Connectivity': '#3b82f6',
  'Bug': '#ef4444',
  'Platform Configuration': '#ffca00',
  'Billing': '#f59e0b',
  'Technical Support': '#6366f1',
  'Other': '#64748b'
}

export default function Tickets({ tickets, onShowTicket, showToast, refreshData }) {
  const [search, setSearch] = useState('')

  const query = search.toLowerCase().trim()
  const pendingTickets = tickets.filter(t => t.status === 'pending_review')
  const displayed = query
    ? pendingTickets.filter(t =>
        (t.problem_summary || '').toLowerCase().includes(query) ||
        (t.company_name || '').toLowerCase().includes(query) ||
        (t.issue_category || '').toLowerCase().includes(query)
      )
    : pendingTickets

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return
    try {
      await deleteTicket(id)
      showToast('Ticket deleted successfully')
      refreshData()
    } catch (err) {
      showToast('Error deleting ticket', 'error')
    }
  }

  return (
    <section className="tickets-section" style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
      <div className="section-header" style={{ marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '38px', fontWeight: 800, color: '#1e293b' }}>Support Ticket Intelligence</h2>
          <p style={{ color: '#64748b', fontSize: '24px', marginTop: '6px' }}>Real-time analysis and triage for all incoming requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="search-box-premium-light" style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', padding: '0 16px', border: '1px solid #e2e8f0', width: '400px' }}>
            <span style={{ marginRight: '10px', fontSize: '24px' }}>🔍</span>
            <input
              type="text"
              placeholder="Filter tickets..."
              style={{ background: 'transparent', border: 'none', padding: '16px 0', fontSize: '24px', width: '100%', outline: 'none', color: '#1e293b' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            className="btn-clear-all" 
            onClick={() => refreshData()}
            style={{ background: 'white', border: '1px solid #e2e8f0', padding: '14px 20px', borderRadius: '10px', fontSize: '24px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="tickets-table-light" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#445164', fontSize: '24px', fontWeight: 700 }}>
              <th style={{ padding: '16px 20px' }}>ID</th>
              <th style={{ padding: '12px 20px' }}>Company</th>
              <th style={{ padding: '12px 20px' }}>Problem</th>
              <th style={{ padding: '12px 20px' }}>Category</th>
              <th style={{ padding: '12px 20px' }}>Severity</th>
              <th style={{ padding: '12px 20px' }}>AI Confidence</th>
              <th style={{ padding: '12px 20px' }}>Status</th>
              <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  {query ? `No matching tickets found for "${query}"` : "No tickets pending review."}
                </td>
              </tr>
            ) : displayed.map(t => {
              const customerName = t.company_name || 'Royal VIVBuisman'
              const category = t.issue_category || 'Other'
              const severity = (t.severity || 'Medium').toLowerCase()
              const status = t.status || 'analyzed'
              const catColor = CAT_COLORS[category] || CAT_COLORS['Other']
              
              return (
                <tr 
                  key={t.id} 
                  onClick={() => onShowTicket(t.id)} 
                  style={{ cursor: 'pointer', background: 'white', transition: 'var(--transition)' }}
                  className="ticket-row-light"
                >
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', borderRadius: '12px 0 0 12px', fontWeight: 800, color: '#668f45', fontSize: '24px' }}>#{t.id}</td>
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=f1f5f9&color=668f45&bold=true`}
                        alt=""
                        style={{ width: '42px', height: '42px', borderRadius: '10px' }}
                      />
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '24px' }} dangerouslySetInnerHTML={{ __html: highlight(customerName, query) }} />
                    </div>
                  </td>
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', maxWidth: '350px' }}>
                    <span style={{ color: '#1e293b', fontSize: '24px', fontWeight: 500, lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: highlight(t.problem_summary, query) }} />
                  </td>
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ padding: '8px 14px', borderRadius: '8px', background: `${catColor}15`, color: catColor, fontSize: '22px', fontWeight: 700 }}>
                      {category}
                    </span>
                  </td>
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <span className={`severity-badge-${severity}`} style={{ fontSize: '21px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {severity}
                    </span>
                  </td>
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: t.confidence_score >= 80 ? 'rgba(102, 143, 69, 0.1)' : (t.confidence_score >= 60 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                      color: t.confidence_score >= 80 ? '#668f45' : (t.confidence_score >= 60 ? '#f59e0b' : '#ef4444'),
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '22px'
                    }}>
                      <span style={{ fontSize: '18px' }}>{t.confidence_score >= 80 ? '🛡️' : (t.confidence_score >= 60 ? '⚠️' : '🚨')}</span>
                      {Math.round(t.confidence_score || 0)}%
                    </div>
                  </td>
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{
                      color: status === 'pending_review' ? '#ef4444' : '#445164',
                      fontSize: '23px',
                      fontWeight: 700
                    }}>{status.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={{ padding: '24px 20px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                    <button
                      onClick={(e) => handleDelete(e, t.id)}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '30px', padding: '4px' }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
