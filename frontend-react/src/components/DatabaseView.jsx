import React, { useState, useEffect } from 'react';
import { getDatabaseView } from '../api';

const DatabaseView = ({ isActive }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('processed'); // Default to Processed (Synced)

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await getDatabaseView();
      setData(rows || []);
    } catch (err) {
      console.error('Failed to fetch database view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchData();
    }
  }, [isActive]);

  const filteredData = data.filter(row => {
    if (filter === 'processed') {
      // Processed means: Synced status AND has AI content AND confidence >= 70%
      return row.status === 'synced' && !!row.problem_summary && row.confidence_score >= 70;
    }
    if (filter === 'pending') {
      // Pending means: (Pending/Open/Missing status) OR (Synced but confidence < 70)
      const isPendingStatus = row.status === 'pending_review' || row.status === 'open' || !row.status;
      const isLowConfidenceSync = row.status === 'synced' && row.confidence_score < 70;
      return (isPendingStatus || isLowConfidenceSync) && row.confidence_score > 0;
    }
    return true;
  });

  const getConfidenceColor = (score) => {
    if (score >= 70) return '#059669'; // 70%+ is now Green
    if (score >= 50) return '#d97706'; // Mid range is Orange
    return '#dc2626'; // Low is Red
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
   const tdAIContentStyle = (hasContent) => ({
    ...tdStyle,
    background: hasContent ? '#f0f9ff' : 'transparent',
    fontSize: '20px', // Matched to Ticket Context
    lineHeight: '1.5',
    color: '#000000',
    fontWeight: 900, // Matched to Ticket Context
    borderLeft: '2px solid #e2e8f0',
  });

  return (
    <div className="database-view-container" style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Database Records: AI Analysis Proof</h1>
          <p style={subtitleStyle}>Definitive proof of technical field enrichment and sync status</p>
        </div>
        
        <div style={filterContainerStyle}>
          <button
            onClick={() => setFilter('processed')}
            style={filterButtonStyle(filter === 'processed')}
          >
            ✅ Processed (Synced)
          </button>
          <button
            onClick={() => setFilter('pending')}
            style={filterButtonStyle(filter === 'pending')}
          >
            ⏳ Pending Review
          </button>
          <button onClick={fetchData} className="refresh-btn" style={refreshButtonStyle}>
            🔄 Refresh Records
          </button>
        </div>
      </header>

      <div className="records-card" style={tableWrapperStyle}>
        {loading ? (
          <div style={loadingStyle}>
            <div className="spinner"></div>
            <p>Accessing Hardcoded Database Persistence Layer...</p>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thIdStyle}>ID</th>
                <th style={thDetailsStyle}>Ticket Context</th>
                <th style={thStatusStyle}>Sync Status</th>
                <th style={thAIStyle}>Problem Summary (AI)</th>
                <th style={thAIStyle}>Root Cause (AI)</th>
                <th style={thAIStyle}>Solution (AI)</th>
                <th style={{ ...thStyle, width: '120px' }}>Conf</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => {
                const hasAI = !!row.problem_summary;
                return (
                  <tr key={row.id} style={trStyle}>
                    <td style={tdIdStyle}>#{row.id}</td>
                    <td style={tdDetailsStyle}>
                      <div style={{ fontWeight: 900, color: '#000000', fontSize: '20px' }}>{row.company_name}</div>
                      <div style={{ fontSize: '15px', color: '#1e293b', marginTop: '6px', fontWeight: 600 }}>{row.issue_category}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(row.status)}>
                        {row.status || 'open'}
                      </span>
                    </td>
                    <td style={tdAIContentStyle(hasAI)}>
                      {row.problem_summary || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Awaiting Intelligence Sweep...</span>}
                    </td>
                    <td style={tdAIContentStyle(hasAI)}>
                      {row.root_cause || '—'}
                    </td>
                    <td style={tdAIContentStyle(hasAI)}>
                      {row.solution_summary || '—'}
                    </td>
                    <td style={tdStyle}>
                      {(row.confidence_score !== undefined && row.confidence_score !== null) ? (
                        <div style={confidenceBadgeStyle(getConfidenceColor(row.confidence_score))}>
                          {row.confidence_score}%
                        </div>
                      ) : (
                        <div style={{ color: '#94a3b8' }}>—</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && filteredData.length === 0 && (
          <div style={emptyStyle}>
            <span style={{ fontSize: '64px' }}>📦</span>
            <h2 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '10px' }}>No records in this state</h2>
            <p style={{ fontSize: '18px' }}>Perform an "Intelligence Sweep" to move tickets to Processed.</p>
          </div>
        )}
      </div>

      <style>{`
        .database-view-container {
          animation: fadeIn 0.4s ease-out;
          font-family: 'Inter', sans-serif;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .refresh-btn:hover {
          filter: brightness(1.2);
          transform: translateY(-2px);
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 6px solid #e2e8f0;
          border-left-color: #000000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        tbody tr:hover {
          background-color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
};

// Styles
const containerStyle = {
  padding: '40px',
  width: '100%',
  minHeight: '100vh',
  background: '#f8fafc',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '50px',
};

const titleStyle = {
  fontSize: '48px',
  fontWeight: 900,
  color: '#000000',
  marginBottom: '12px',
  letterSpacing: '-0.04em',
};

const subtitleStyle = {
  color: '#1e293b',
  fontSize: '22px',
  fontWeight: 600,
  opacity: 0.8,
};

const filterContainerStyle = {
  display: 'flex',
  gap: '15px',
  background: '#ffffff',
  padding: '10px',
  borderRadius: '20px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
  border: '1px solid #e2e8f0',
};

const filterButtonStyle = (active) => ({
  padding: '14px 28px',
  borderRadius: '14px',
  border: 'none',
  fontSize: '16px',
  fontWeight: 800,
  cursor: 'pointer',
  background: active ? '#000000' : 'transparent',
  color: active ? '#ffffff' : '#475569',
  transition: 'all 0.3s ease',
  boxShadow: active ? '0 8px 20px rgba(0,0,0,0.2)' : 'none',
});

const refreshButtonStyle = {
  marginLeft: '10px',
  padding: '14px 28px',
  borderRadius: '14px',
  border: 'none',
  background: '#3b82f6',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
};

const tableWrapperStyle = {
  background: '#ffffff',
  borderRadius: '32px',
  border: '2px solid #000000',
  boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  width: '100%',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const thStyle = {
  padding: '30px 25px',
  background: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const thIdStyle = { ...thStyle, width: '80px' };
const thDetailsStyle = { ...thStyle, width: '250px' };
const thStatusStyle = { ...thStyle, width: '150px' };
const thAIStyle = { ...thStyle, background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.1)' };
const thScoreStyle = { ...thStyle, width: '100px' };
const thDateStyle = { ...thStyle, width: '200px' };

const trStyle = {
  borderBottom: '1px solid #e2e8f0',
  transition: 'all 0.2s ease',
};

const tdStyle = {
  padding: '30px 25px',
  fontSize: '16px',
  color: '#000000',
};

const tdIdStyle = {
  ...tdStyle,
  color: '#64748b',
  fontWeight: 800,
  fontSize: '14px',
};

const tdDetailsStyle = {
  ...tdStyle,
};

const tdAIContentStyle = (isProcessed) => ({
  ...tdStyle,
  background: isProcessed ? '#f0f9ff' : 'transparent',
  fontSize: '15px',
  lineHeight: '1.7',
  color: isProcessed ? '#000000' : '#94a3b8',
  fontWeight: isProcessed ? 500 : 400,
  borderLeft: '1px solid #e2e8f0',
});

const tdDateStyle = {
  ...tdStyle,
  fontSize: '14px',
  borderLeft: '1px solid #e2e8f0',
};

const statusBadgeStyle = (status) => {
  const colors = {
    synced: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    pending_review: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
    analyzed: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
    open: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' }
  };
  const theme = colors[status] || colors.open;
  return {
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 900,
    textTransform: 'uppercase',
    background: theme.bg,
    color: theme.text,
    border: `2px solid ${theme.border}`,
  };
};

const confidenceBadgeStyle = (color) => ({
  padding: '10px 15px',
  borderRadius: '10px',
  background: color,
  color: '#fff',
  fontWeight: 900,
  fontSize: '15px',
  textAlign: 'center',
  display: 'inline-block',
  minWidth: '60px',
});

const loadingStyle = {
  padding: '150px',
  textAlign: 'center',
  color: '#000000',
  fontWeight: 700,
  fontSize: '20px',
};

const emptyStyle = {
  padding: '150px',
  textAlign: 'center',
  color: '#64748b',
};

export default DatabaseView;
