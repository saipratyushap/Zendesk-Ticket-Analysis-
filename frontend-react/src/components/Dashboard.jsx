import { useState } from 'react'

export default function Dashboard() {
  return (
    <div className="dashboard-container-new" style={{ background: 'white', minHeight: '100vh', padding: '0 0 60px 0' }}>
      <div className="dashboard-hero-premium" style={{ 
        borderBottom: '1px solid #f1f5f9', 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
        padding: '32px 0 48px 0', 
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative element */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(102, 143, 69, 0.04) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        
        <div style={{ width: '100%', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(102, 143, 69, 0.08)', color: '#668f45', borderRadius: '100px', fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            Enterprise AI Pipeline
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#0f172a', marginBottom: '16px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Zendesk <span style={{ color: '#668f45' }}>Ticket Intelligence</span>
          </h1>
          <p style={{ color: '#475569', fontSize: '24px', lineHeight: 1.6, marginBottom: '0', fontWeight: 450, maxWidth: '1000px' }}>
            Unified support analysis engine designed for scale. Classify, triage, and extract actionable insights from your ticket data with state-of-the-art LLMs.
          </p>
        </div>
      </div>

      <div className="how-to-use-section" style={{ background: '#edf5ea', padding: '48px 0' }}>
        <div className="how-to-use" style={{ width: '100%', padding: '0 24px', margin: '0 auto', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#1e3a5f', marginBottom: '12px', letterSpacing: '-0.01em', textAlign: 'left' }}>How to Use This Tool</h2>
          <p style={{ color: '#64748b', fontSize: '22px', marginBottom: '24px', textAlign: 'left', lineHeight: 1.6, fontWeight: 500 }}>
            Unified 3-step process for Zendesk ticket intelligence. Tickets are automatically ingested via API, analyzed by AI, and persisted for review.
          </p>
          
          <div style={{ height: '2px', background: '#668f45', width: '100%', marginBottom: '40px', borderRadius: '2px' }}></div>
 
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', width: '100%' }}>
            {[
              { n: 1, t: 'AI Intelligence Sweep', d: 'The advanced AI engine performs semantic analysis, root cause extraction, and sentiment classification as tickets are received.' },
              { n: 2, t: 'Review Ticket Details', d: 'Navigate through enriched tickets featuring automated solution summaries, stakeholder mapping, and knowledge base links.' },
              { n: 3, t: 'Analyze Global Trends', d: 'Monitor high-level KPIs and performance metrics in the Reports tab to identify recurring issues and operational bottlenecks.' }
            ].map(step => (
              <div key={step.n} style={{ 
                background: 'white', 
                padding: '30px 24px', 
                borderRadius: '16px', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: '1px solid #f1f5f9'
              }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  background: '#668f45', 
                  color: 'white', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: '700', 
                  fontSize: '32px', 
                  marginBottom: '20px'
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#1e3a5f', marginBottom: '12px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{step.t}</h3>
                <p style={{ color: '#64748b', fontSize: '18px', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
