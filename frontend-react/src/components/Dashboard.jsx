import { useState } from 'react'

export default function Dashboard() {
  return (
    <div className="dashboard-container-new" style={{ background: 'white', minHeight: '100vh', padding: '0 0 60px 0' }}>
      <div className="dashboard-hero-premium" style={{ 
        borderBottom: '1px solid #f1f5f9', 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
        padding: '40px 0 60px 0', 
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative element */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(102, 143, 69, 0.04) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        
        <div style={{ maxWidth: '1600px', padding: '0 60px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(102, 143, 69, 0.08)', color: '#668f45', borderRadius: '100px', fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
            Enterprise AI Pipeline
          </div>
          <h1 style={{ fontSize: '62px', fontWeight: 900, color: '#0f172a', marginBottom: '24px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Zendesk <span style={{ color: '#668f45' }}>Ticket Intelligence</span>
          </h1>
          <p style={{ color: '#475569', fontSize: '28px', lineHeight: 1.7, marginBottom: '0', fontWeight: 450, maxWidth: '1000px' }}>
            Unified support analysis engine designed for scale. Classify, triage, and extract actionable insights from your ticket data with state-of-the-art LLMs.
          </p>
        </div>
      </div>

      <div className="how-to-use-section" style={{ background: '#edf5ea', padding: '60px 0' }}>
        <div className="how-to-use" style={{ width: '100%', padding: '0 60px', margin: '0 auto', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '54px', fontWeight: 800, color: '#1e3a5f', marginBottom: '16px', letterSpacing: '-0.01em', textAlign: 'left' }}>How to Use This Tool</h2>
          <p style={{ color: '#64748b', fontSize: '30px', marginBottom: '32px', textAlign: 'left', lineHeight: 1.6, fontWeight: 500 }}>
            Unified 3-step process for Zendesk ticket intelligence. Tickets are automatically ingested via API, analyzed by AI, and persisted for review.
          </p>
          
          <div style={{ height: '3px', background: '#668f45', width: '100%', marginBottom: '50px', borderRadius: '2px' }}></div>
 
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', width: '100%' }}>
            {[
              { n: 1, t: 'AI Intelligence Sweep', d: 'The advanced AI engine performs semantic analysis, root cause extraction, and sentiment classification as tickets are received.' },
              { n: 2, t: 'Review Ticket Details', d: 'Navigate through enriched tickets featuring automated solution summaries, stakeholder mapping, and knowledge base links.' },
              { n: 3, t: 'Analyze Global Trends', d: 'Monitor high-level KPIs and performance metrics in the Reports tab to identify recurring issues and operational bottlenecks.' }
            ].map(step => (
              <div key={step.n} style={{ 
                background: 'white', 
                padding: '50px 40px', 
                borderRadius: '16px', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: '1px solid #f1f5f9'
              }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  background: '#668f45', 
                  color: 'white', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: '700', 
                  fontSize: '42px', 
                  marginBottom: '32px'
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontSize: '38px', fontWeight: 700, color: '#1e3a5f', marginBottom: '20px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{step.t}</h3>
                <p style={{ color: '#64748b', fontSize: '28px', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
