import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Tickets from './components/Tickets'
import Accounts from './components/Accounts'
import Reports from './components/Reports'
import ConsultAIDesk from './components/ConsultAIDesk'
import DatabaseView from './components/DatabaseView'
import TicketFormModal from './components/modals/TicketFormModal'
import TicketDetailsModal from './components/modals/TicketDetailsModal'
import AccountDetailModal from './components/modals/AccountDetailModal'
import Toast from './components/shared/Toast'

import { getTickets, getStats } from './api'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState(null)



  const [showTicketForm, setShowTicketForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)

  const [toast, setToast] = useState({ visible: false, message: '' })

  useEffect(() => {
    if (selectedTicket !== null) {
      document.body.classList.add('no-scroll')
    } else {
      document.body.classList.remove('no-scroll')
    }
    return () => document.body.classList.remove('no-scroll')
  }, [selectedTicket])

  const showToast = useCallback((message) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: '' }), 3000)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      const [statsData, ticketsData] = await Promise.all([getStats(), getTickets()])
      setStats(statsData)
      setTickets(ticketsData)
    } catch (err) {
      console.error('Failed to refresh data:', err)
    }
  }, [])

  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 3000)
    return () => clearInterval(interval)
  }, [refreshData])

  return (
    <div className="layout-wrapper">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <div className="main-content">

        <main id="dashboard" className={`page${activePage === 'dashboard' ? ' active' : ''}`}>
          <Dashboard />
        </main>

        <main id="tickets" className={`page${activePage === 'tickets' ? ' active' : ''}`}>
          <Tickets
            tickets={tickets.filter(t => t.status === 'pending_review' || !t.status)}
            onShowTicket={setSelectedTicket}
            showToast={showToast}
            refreshData={refreshData}
          />
        </main>

{/* <main id="accounts" className={`page${activePage === 'accounts' ? ' active' : ''}`}>
          <Accounts
            tickets={tickets}
            onShowAccountDetail={setSelectedAccount}
            isActive={activePage === 'accounts'}
          />
        </main> */}

        <main id="reports" className={`page${activePage === 'reports' ? ' active' : ''}`}>
          <Reports
            stats={stats}
            isActive={activePage === 'reports'}
          />
        </main>



        <main id="consult" className={`page${activePage === 'consult' ? ' active' : ''}`}>
          <ConsultAIDesk showToast={showToast} />
        </main>

        <main id="database-view" className={`page${activePage === 'database-view' ? ' active' : ''}`}>
          <DatabaseView isActive={activePage === 'database-view'} />
        </main>
        

      </div>


      {showTicketForm && (
        <TicketFormModal
          onClose={() => setShowTicketForm(false)}
          showToast={showToast}
          refreshData={refreshData}
        />
      )}

      {selectedTicket !== null && activePage === 'tickets' && (
        <TicketDetailsModal
          ticket={tickets.find(t => t.id === selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          showToast={showToast}
          refreshData={refreshData}
        />
      )}

{/* {selectedAccount !== null && activePage === 'accounts' && (
        <AccountDetailModal
          company={selectedAccount}
          tickets={tickets}
          onClose={() => setSelectedAccount(null)}
          onShowTicket={(id) => { setSelectedAccount(null); setSelectedTicket(id) }}
        />
      )} */}

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  )
}
