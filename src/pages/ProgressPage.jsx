import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Nav from '../components/Nav'

export default function ProgressPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [weightLogs, setWeightLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayWeight, setTodayWeight] = useState('')
  const [logMsg, setLogMsg] = useState('')

  useEffect(() => {
    load()
  }, [user.id])

  async function load() {
    const [{ data: prof }, { data: logs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: true })
    ])
    setProfile(prof)
    setWeightLogs(logs || [])
    setLoading(false)
  }

  async function logWeight(e) {
    e.preventDefault()
    if (!todayWeight) return
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('weight_logs').upsert({
      user_id: user.id, weight_kg: parseFloat(todayWeight), logged_at: today
    }, { onConflict: 'user_id,logged_at' })
    if (!error) {
      setLogMsg('✓ Weight logged!')
      setTodayWeight('')
      await load()
      setTimeout(() => setLogMsg(''), 3000)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>

  const sorted = [...weightLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
  const latest = sorted[sorted.length - 1]?.weight_kg
  const first = sorted[0]?.weight_kg
  const totalChange = latest && first ? (latest - first).toFixed(1) : null
  const goal = profile?.weight_kg

  return (
    <>
      <Nav profile={profile} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '28px 20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>Progress</h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '28px' }}>Track your weight over time</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          <StatCard label="Starting weight" value={first ? `${first} kg` : '—'} />
          <StatCard label="Current weight" value={latest ? `${latest} kg` : '—'}
            highlight={totalChange ? (parseFloat(totalChange) < 0 ? 'green' : 'red') : null} />
          <StatCard label="Total change"
            value={totalChange ? `${totalChange > 0 ? '+' : ''}${totalChange} kg` : '—'}
            sub={`${sorted.length} entries logged`} />
        </div>

        {/* Chart */}
        {sorted.length > 1 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Weight over time</h3>
            <WeightChart logs={sorted} />
          </div>
        )}

        {/* Log weight */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Log today's weight</h3>
          <form onSubmit={logWeight} style={{ display: 'flex', gap: '10px', maxWidth: '360px' }}>
            <input
              type="number" step="0.1" min="30" max="300"
              value={todayWeight}
              onChange={e => setTodayWeight(e.target.value)}
              placeholder={`e.g. ${latest || 75}`}
              style={{ flex: 1 }}
            />
            <button type="submit" style={{
              background: 'var(--green)', color: 'white', padding: '10px 20px',
              borderRadius: '8px', fontSize: '14px', fontWeight: '500'
            }}>Log</button>
          </form>
          {logMsg && <p style={{ fontSize: '13px', color: 'var(--green)', marginTop: '8px' }}>{logMsg}</p>}
        </div>

        {/* History table */}
        {sorted.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>History</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--muted)', fontWeight: '500' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--muted)', fontWeight: '500' }}>Weight</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--muted)', fontWeight: '500' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().slice(0, 20).map((log, i, arr) => {
                  const prev = arr[i + 1]?.weight_kg
                  const diff = prev ? (log.weight_kg - prev).toFixed(1) : null
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 0', color: 'var(--muted)' }}>
                        {new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '500' }}>{log.weight_kg} kg</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontSize: '13px',
                        color: diff ? (parseFloat(diff) <= 0 ? 'var(--green)' : '#E24B4A') : 'var(--muted)' }}>
                        {diff ? `${diff > 0 ? '+' : ''}${diff}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {sorted.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📈</div>
            <p>No weight entries yet. Log your first weight above!</p>
          </div>
        )}
      </div>
    </>
  )
}

function StatCard({ label, value, sub, highlight }) {
  const colors = { green: 'var(--green)', red: '#E24B4A' }
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Syne', color: highlight ? colors[highlight] : 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function WeightChart({ logs }) {
  const W = 700, H = 160, PL = 48, PR = 20, PT = 10, PB = 30
  const iW = W - PL - PR, iH = H - PT - PB
  const weights = logs.map(l => l.weight_kg)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const toX = i => PL + (i / (logs.length - 1)) * iW
  const toY = w => PT + iH - ((w - minW) / range) * iH

  const points = logs.map((l, i) => `${toX(i)},${toY(l.weight_kg)}`).join(' ')

  // Y axis labels
  const yLabels = [minW, (minW + maxW) / 2, maxW].map(v => v.toFixed(1))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {/* Grid lines */}
      {[0, 0.5, 1].map((t, i) => (
        <line key={i} x1={PL} x2={W - PR} y1={PT + iH * (1 - t)} y2={PT + iH * (1 - t)}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
      ))}
      {/* Y labels */}
      {[0, 0.5, 1].map((t, i) => (
        <text key={i} x={PL - 8} y={PT + iH * (1 - t) + 4} textAnchor="end" fontSize="11" fill="#888">{yLabels[i]}</text>
      ))}
      {/* X labels - first, mid, last */}
      {[0, Math.floor((logs.length - 1) / 2), logs.length - 1].map(i => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#888">
          {new Date(logs[i].logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </text>
      ))}
      {/* Line */}
      <polyline points={points} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {logs.map((l, i) => (
        <circle key={i} cx={toX(i)} cy={toY(l.weight_kg)} r="3" fill="var(--green)" />
      ))}
    </svg>
  )
}
