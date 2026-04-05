import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      background: 'linear-gradient(135deg, #f8f7f4 0%, #e8f5ef 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px' }}>
            Fit<span style={{ color: 'var(--green)' }}>Fuel</span>
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '6px', fontSize: '15px' }}>
            AI-powered diet planning for your fitness goals
          </p>
        </div>

        <div className="card" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: '#f1f0ec',
            borderRadius: '10px', padding: '4px', marginBottom: '24px'
          }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setMessage('') }}
                style={{
                  flex: 1, padding: '9px', borderRadius: '8px', fontSize: '14px',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--muted)',
                  fontWeight: mode === m ? '500' : '400',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="label">Email</label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className="label">Password</label>
              <input
                type="password" value={password} required
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && <p className="error-msg" style={{ marginBottom: '12px' }}>{error}</p>}
            {message && (
              <p style={{ fontSize: '13px', color: 'var(--green)', marginBottom: '12px' }}>{message}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '20px' }}>
          Your data is stored securely. We never share it.
        </p>
      </div>
    </div>
  )
}
