import React, { useState, useEffect } from 'react';
import { getDatabaseView, clearTickets, seedTickets, closeTicket } from '../api';

// Premium Styling Tokens (copied from Tickets.jsx for consistency)
const thStyle = {
  padding: '30px 25px',
  background: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const statusBadgeStyleRaw = (status) => {
  const colors = {
    synced: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    CLOSED: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    pending_review: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
    analyzed: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
    OPEN: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' }
  };
  const theme = colors[status] || colors.OPEN;
  return {
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 900,
    textTransform: 'uppercase',
    background: theme.bg,
    color: theme.text,
    border: `2px solid ${theme.border}`,
    display: 'inline-block',
    whiteSpace: 'nowrap'
  };
};

const DatabaseView = ({ isActive }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showAiColumns, setShowAiColumns] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await getDatabaseView();
      setData(rows || []);
      const hasAnyAi = rows && rows.some(r => !!r.problem_summary);
      if (hasAnyAi) setShowAiColumns(true);
    } catch (err) {
      console.error('Failed to fetch database view:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all records?')) return;
    try {
      await clearTickets();
      setData([]);
      setShowAiColumns(false);
    } catch (err) {
      alert('Failed to clear');
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedTickets();
      setShowAiColumns(false);
      await fetchData();
    } catch (err) {
      alert('Failed to seed');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClose = async (id) => {
    try {
      await closeTicket(id);
      setShowAiColumns(true);
      await fetchData();
    } catch (err) {
      alert('Failed to close/process');
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchData();
      const interval = setInterval(fetchData, 8000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  return (
    <div className="database-view-container" style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Database View</h1>
          <p style={subtitleStyle}>Premium AI Intelligence Pipeline Explorer</p>
        </div>
        
        <div style={actionContainerStyle}>
          <button onClick={handleDeleteAll} disabled={loading || isSeeding} style={{ ...actionButtonStyle, background: '#dc2626', opacity: (loading || isSeeding) ? 0.6 : 1 }}>
            🗑️ Delete All
          </button>
          <button onClick={handleSeed} disabled={loading || isSeeding} style={{ ...actionButtonStyle, background: '#059669', opacity: (loading || isSeeding) ? 0.6 : 1 }}>
            {isSeeding ? 'Seeding...' : '🌱 Repopulate Sample Data'}
          </button>
          <button onClick={fetchData} disabled={loading || isSeeding} style={{ ...actionButtonStyle, background: '#3b82f6', opacity: (loading || isSeeding) ? 0.6 : 1 }}>
            {loading ? '🔄 Refreshing...' : '🔄 Refresh View'}
          </button>
        </div>
      </header>

      <div className="records-card" style={tableWrapperStyle}>
        {data.length === 0 ? (
          <div style={emptyStyle}>
            <span style={{ fontSize: '48px' }}>🔍</span>
            <h2 style={{ color: '#64748b' }}>No Data Populated</h2>
            <p>Click "Repopulate Sample Data" to start the simulation.</p>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '80px' }}>ID</th>
                <th style={{ ...thStyle, width: '220px' }}>Company</th>
                <th style={{ ...thStyle, width: '500px' }}>Problem Summary (AI)</th>
                {!showAiColumns && <th style={{ ...thStyle, width: '180px' }}>Status</th>}
                {showAiColumns && (
                  <>
                    <th style={{ ...thStyle, width: '400px' }}>Strategic Roadmap</th>
                    <th style={{ ...thStyle, width: '200px' }}>Root Cause (AI)</th>
                    <th style={{ ...thStyle, width: '150px' }}>Category</th>
                    <th style={{ ...thStyle, width: '150px' }}>Severity</th>
                    <th style={{ ...thStyle, width: '140px' }}>Confidence</th>
                    <th style={{ ...thStyle, width: '200px' }}>Status</th>
                  </>
                )}
                <th style={{ ...thStyle, width: '120px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const customerName = row.company_name || 'Factbird User';
                const severity = (row.severity || 'Medium').toLowerCase();
                const confidence = Math.round(row.confidence_score || 0);

                return (
                  <tr key={row.id} style={trStyle} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '30px 25px', color: '#64748b', fontWeight: 800, fontSize: '18px' }}>#{row.id}</td>
                    <td style={{ padding: '30px 25px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=f1f5f9&color=668f45&bold=true`}
                          alt=""
                          style={{ width: '52px', height: '52px', borderRadius: '12px' }}
                        />
                        <span style={{ fontWeight: 900, color: '#000000', fontSize: '24px' }}>{customerName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '30px 25px', background: row.problem_summary ? '#f0f9ff' : 'transparent', borderLeft: '2px solid #e2e8f0' }}>
                      <span style={{ color: '#000000', fontSize: '20px', fontWeight: 900, lineHeight: '1.6', display: 'block' }}>
                        {row.problem_summary || row.Description || 'Pending Processing...'}
                      </span>
                    </td>
                    
                    {!showAiColumns && (
                      <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0' }}>
                        <span style={statusBadgeStyleRaw(row.status === 'pending_review' ? 'CLOSED' : row.status)}>
                          {(row.status === 'pending_review' ? 'CLOSED' : row.status).replace(/_/g, ' ')}
                        </span>
                      </td>
                    )}

                    {showAiColumns && (
                      <>
                        <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0' }}>
                          <div style={{ color: '#000000', fontSize: '20px', fontWeight: 900, lineHeight: '1.6' }}>
                            {row.solution_summary || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0' }}>
                          <div style={{ color: '#000000', fontSize: '20px', fontWeight: 900, lineHeight: '1.6', fontStyle: 'normal' }}>
                            {row.root_cause || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0' }}>
                          <span style={{ 
                            fontSize: '15px', 
                            fontWeight: 800, 
                            color: '#4f46e5',
                            textTransform: 'uppercase'
                          }}>
                            {row.issue_category || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0' }}>
                          <span style={{ 
                            fontSize: '18px', 
                            fontWeight: 800, 
                            textTransform: 'uppercase',
                            color: severity === 'critical' ? '#dc2626' : (severity === 'high' ? '#ea580c' : '#64748b')
                          }}>
                            {severity}
                          </span>
                        </td>
                        <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0' }}>
                          <div style={{
                            padding: '10px 15px',
                            borderRadius: '10px',
                            background: confidence >= 80 ? '#059669' : (confidence >= 60 ? '#d97706' : '#dc2626'),
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '15px',
                            textAlign: 'center',
                            display: 'inline-block',
                            minWidth: '60px'
                          }}>
                            {confidence}%
                          </div>
                        </td>
                        <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0' }}>
                          <span style={statusBadgeStyleRaw(row.status === 'pending_review' ? 'CLOSED' : row.status)}>
                            {(row.status === 'pending_review' ? 'CLOSED' : row.status).replace(/_/g, ' ')}
                          </span>
                        </td>
                      </>
                    )}

                    <td style={{ padding: '30px 25px', borderLeft: '1px solid #e2e8f0', textAlign: 'right' }}>
                      {row.status === 'OPEN' && (
                        <button onClick={() => handleClose(row.id)} style={closeButtonStyle}>
                          🔒 Close Ticket
                        </button>
                      )}
                      {(row.status === 'CLOSED' || row.status === 'pending_review') && (
                        <span style={{ color: '#059669', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          ✅ PROCESSED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .database-view-container { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

// Layout Styles
const containerStyle = { padding: '40px', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' };
const titleStyle = { fontSize: '48px', fontWeight: 900, color: '#000000', marginBottom: '12px', letterSpacing: '-0.04em' };
const subtitleStyle = { color: '#1e293b', fontSize: '22px', fontWeight: 600, opacity: 0.8 };
const actionContainerStyle = { display: 'flex', gap: '16px', alignItems: 'center' };
const actionButtonStyle = { 
  background: '#3b82f6', 
  color: '#ffffff', 
  padding: '16px 28px', 
  borderRadius: '14px', 
  border: 'none', 
  fontSize: '16px', 
  fontWeight: 800, 
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
  transition: 'all 0.3s ease'
};

const tableWrapperStyle = { 
  background: '#ffffff', 
  borderRadius: '32px', 
  border: '2px solid #000000', 
  boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15)', 
  overflow: 'hidden' 
};

const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const trStyle = { borderBottom: '1px solid #e2e8f0', transition: 'all 0.2s ease' };
const emptyStyle = { padding: '100px', textAlign: 'center' };

const closeButtonStyle = {
  background: '#000000',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '12px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 900,
  textTransform: 'uppercase',
  cursor: 'pointer',
  letterSpacing: '0.05em'
};

export default DatabaseView;
