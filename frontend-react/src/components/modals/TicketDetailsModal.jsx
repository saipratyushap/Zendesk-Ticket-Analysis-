import { useState } from 'react'
import { approveTicket } from '../../api'

export default function TicketDetailsModal({ ticket, onClose, showToast, refreshData }) {
  const [approving, setApproving] = useState(false)

  if (!ticket) return null


  const severity = (ticket.severity || 'Medium').toLowerCase()

  async function handleApprove() {
    setApproving(true)
    try {
      await approveTicket(ticket.id)
      showToast('Ticket Synced to Zendesk!')
      onClose()
      refreshData()
    } catch (err) {
      showToast('Approval failed')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div id="ticket-details-modal" className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content modal-premium-light" style={{ width: '1100px', maxWidth: '95%', padding: '0' }}>
        {/* Header Section */}
        <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: '1px solid #f1f5f9' }}>
              🏢
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#668f45', textTransform: 'uppercase', letterSpacing: '1px' }}>TICKET #{ticket.id}</div>
              <h2 style={{ fontSize: '32px', fontWeight: 900, margin: '2px 0 0 0', color: '#0f172a' }}>
                {ticket.company_name || 'Royal VIVBuisman'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '44px', height: '44px', borderRadius: '50%', fontSize: '24px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div className="modal-body" style={{ padding: '40px' }}>
          <div className="ticket-details-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '50px' }}>

            {/* Main Content */}
            <div className="details-main-col" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

              {/* Solution Summary Hero */}
              <div className="solution-hero-premium">
                <div className="section-label-premium" style={{ color: '#166534' }}>
                  <span>🎯</span> STRATEGIC SOLUTION SUMMARY
                </div>
                <p style={{ color: '#064e3b', lineHeight: 1.7, fontSize: '24px', fontWeight: 600, margin: 0 }}>
                  {ticket.solution_summary || 'Resolution in progress; support is currently investigating.'}
                </p>
              </div>

              {/* Insights Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="premium-insight-card">
                  <div className="section-label-premium">🔍 Root Cause</div>
                  <p style={{ fontSize: '20px', color: '#1e293b', fontWeight: 500, margin: 0 }}>
                    {ticket.root_cause || 'Investigating potential technical anomalies.'}
                  </p>
                </div>
                <div className="premium-insight-card" style={{ borderLeft: '4px solid #668f45' }}>
                  <div className="section-label-premium" style={{ color: '#668f45' }}>⚡ Suggested Action</div>
                  <p style={{ fontSize: '20px', color: '#1e293b', fontWeight: 700, margin: 0 }}>
                    {ticket.suggested_action || `Standard protocol for ${(!ticket.company_name || ticket.company_name === 'Unknown') ? 'this customer' : ticket.company_name}`}
                  </p>
                </div>
              </div>

              {/* Problem Brief */}
              <div className="detail-block">
                <div className="section-label-premium">
                  <div className="header-accent-premium"></div>
                  📄 Problem Summary
                </div>
                <div className="problem-block-refined">
                  <p style={{ color: '#7f1d1d', lineHeight: 1.7, fontSize: '21px', fontWeight: 500, margin: 0 }}>{ticket.problem_summary}</p>
                </div>
              </div>

            </div>

            {/* Sidebar Column */}
            <div className="details-side-col" style={{ paddingLeft: '0', borderLeft: 'none' }}>
              <div style={{ position: 'sticky', top: '0', display: 'flex', flexDirection: 'column', gap: '30px' }}>

                {/* Meta Card */}
                <div className="meta-grid-premium">

                  <div className="meta-row-premium">
                    <div className="sidebar-icon-premium">📡</div>
                    <div className="meta-item-refined" style={{ flex: 1 }}>
                      <label>Severity</label>
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: severity === 'high' ? '#fee2e2' : severity === 'medium' ? '#fef3c7' : '#dcfce7',
                        color: severity === 'high' ? '#991b1b' : severity === 'medium' ? '#92400e' : '#166534',
                        fontSize: '16px',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>{severity}</div>
                    </div>
                  </div>

                  <div className="meta-row-premium">
                    <div className="sidebar-icon-premium" style={{ color: '#668f45' }}>🎯</div>
                    <div className="meta-item-refined" style={{ flex: 1 }}>
                      <label>AI Confidence</label>
                      <div style={{ color: '#668f45', fontSize: '32px', fontWeight: 900 }}>
                        {ticket.confidence_score != null && ticket.confidence_score !== '' ? (() => {
                          const raw = parseFloat(ticket.confidence_score)
                          const pct = raw <= 1 ? Math.round(raw * 100) : raw <= 10 ? Math.round(raw * 10) : Math.round(raw)
                          return `${pct}%`
                        })() : '--'}
                      </div>
                    </div>
                  </div>

                  <div className="meta-row-premium">
                    <div className="sidebar-icon-premium">🗂️</div>
                    <div className="meta-item-refined" style={{ flex: 1, minWidth: 0 }}>
                      <label>Category</label>
                      <div className="value" style={{ fontSize: '16px', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.4 }}>
                        {(ticket.issue_category || 'General').replace(/\s*\(.*?\)\s*/g, '').trim() || ticket.issue_category || 'General'}
                      </div>
                    </div>
                  </div>

                  <div className="meta-row-premium">
                    <div className="sidebar-icon-premium">🏷️</div>
                    <div className="meta-item-refined" style={{ flex: 1, minWidth: 0 }}>
                      <label>Subcategory</label>
                      <div className="value" style={{ fontSize: '16px', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.4 }}>{ticket.issue_subcategory || '—'}</div>
                    </div>
                  </div>

                  <div className="meta-row-premium">
                    <div className="sidebar-icon-premium">🚩</div>
                    <div className="meta-item-refined" style={{ flex: 1 }}>
                      <label>Churn Risk</label>
                      <div style={{ color: ticket.churn_risk === 'Yes' ? '#ef4444' : '#1e293b', fontWeight: 800, fontSize: '20px' }}>
                        {(ticket.churn_risk || 'No').toUpperCase()}
                      </div>
                    </div>
                  </div>

                </div>


                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ticket.status === 'pending_review' && (
                    <button onClick={handleApprove} disabled={approving} style={{
                      width: '100%', padding: '20px', borderRadius: '16px', border: 'none',
                      background: '#668f45', color: 'white', fontWeight: 800, fontSize: '20px',
                      cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(102, 143, 69, 0.4)'
                    }}>
                      {approving ? 'Syncing...' : 'Approve & Sync CRM'}
                    </button>
                  )}
                  <button onClick={onClose} style={{
                    width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    background: 'white', color: '#64748b', fontWeight: 700, fontSize: '18px', cursor: 'pointer'
                  }}>
                    Close Ticket
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
