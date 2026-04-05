import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Nav({ profile }) {
  const { pathname } = useLocation()

  async function logout() {
    await supabase.auth.signOut()
  }

  const links = [
    { to: '/', label: 'Dashboard' },
    { to: '/plan', label: 'My Plan' },
    { to: '/progress', label: 'Progress' },
  ]

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <nav style={{
      background: 'white', borderBottom: '1px solid var(--border)',
      padding: '0 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', height: '58px',
      position: 'sticky', top: 0, zIndex: 100
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text)' }}>
          Fit<span style={{ color: 'var(--green)' }}>Fuel</span>
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '4px' }}>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{
            textDecoration: 'none', padding: '6px 14px', borderRadius: '8px',
            fontSize: '14px', fontWeight: pathname === l.to ? '500' : '400',
            color: pathname === l.to ? 'var(--text)' : 'var(--muted)',
            background: pathname === l.to ? '#f1f0ec' : 'transparent',
            transition: 'all 0.15s'
          }}>{l.label}</Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{profile?.name}</span>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: 'var(--green-light)', color: 'var(--green-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '600', cursor: 'pointer'
        }} onClick={logout} title="Click to log out">
          {initials}
        </div>
      </div>
    </nav>
  )
}
