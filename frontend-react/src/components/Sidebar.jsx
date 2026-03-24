export default function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'tickets', icon: '🎫', label: 'Tickets' },
    { id: 'database-view', icon: '🗄️', label: 'Database View' },
    { id: 'reports', icon: '📊', label: 'Analytics' },
    { id: 'consult', icon: '🤖', label: 'Consult AI Desk' },
  ]

  return (
    <aside className="sidebar">
      <div className="logo">
        <span>Zendesk</span>
      </div>
      <nav className="side-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            data-page={item.id}
            onClick={() => setActivePage(item.id)}
          >
            <span className="icon">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
