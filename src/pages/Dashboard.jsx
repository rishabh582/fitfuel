import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Nav from '../components/Nav'

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [mealPlan, setMealPlan] = useState(null)
  const [weightLogs, setWeightLogs] = useState([])
  const [todayWeight, setTodayWeight] = useState('')
  const [logMsg, setLogMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: prof }, { data: plan }, { data: logs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('meal_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(30)
      ])
      setProfile(prof)
      setMealPlan(plan)
      setWeightLogs(logs || [])
      setLoading(false)
    }
    load()
  }, [user.id])

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
      // Refresh logs
      const { data } = await supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(30)
      setWeightLogs(data || [])
      setTimeout(() => setLogMsg(''), 3000)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
        <p>Loading your plan...</p>
      </div>
    </div>
  )

  const currentWeight = weightLogs[0]?.weight_kg || profile?.weight_kg
  const startWeight = weightLogs.length > 1 ? weightLogs[weightLogs.length - 1].weight_kg : profile?.weight_kg
  const weightChange = currentWeight && startWeight ? (currentWeight - startWeight).toFixed(1) : null

  // Parse meal plan JSON
  let meals = []
  let macroTargets = {}
  try {
    const parsed = typeof mealPlan?.plan_data === 'string' ? JSON.parse(mealPlan.plan_data) : mealPlan?.plan_data
    meals = parsed?.meals || []
    macroTargets = parsed?.targets || {}
  } catch (e) {}

  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0)

  return (
    <>
      <Nav profile={profile} />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>
            Good {getTimeOfDay()}, {profile?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {mealPlan
              ? `Your ${profile?.goal?.replace('_', ' ')} plan is active · ${totalCals} kcal target`
              : 'Generate your AI meal plan to get started'}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          <StatCard label="Current weight" value={currentWeight ? `${currentWeight} kg` : '—'}
            sub={weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange} kg total` : 'Log your weight below'} />
          <StatCard label="Daily calories" value={totalCals ? `${totalCals} kcal` : '—'}
            sub={macroTargets?.protein ? `${macroTargets.protein}g protein target` : 'Plan not generated yet'} />
          <StatCard label="Workout level" value={profile?.workout_level || '—'}
            sub={`${profile?.workout_days} days/week · ${profile?.goal?.replace('_', ' ')}`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          {/* Meals */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px' }}>Today's meals</h2>
              {!mealPlan && (
                <a href="/plan" style={{ fontSize: '13px', color: 'var(--green)', textDecoration: 'none', fontWeight: '500' }}>
                  Generate plan →
                </a>
              )}
            </div>

            {meals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meals.map((meal, i) => (
                  <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        {meal.time} · {meal.name}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>{meal.description}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Protein', val: meal.protein, unit: 'g', color: '#E1F5EE', textColor: '#0F6E56' },
                          { label: 'Carbs', val: meal.carbs, unit: 'g', color: '#E6F1FB', textColor: '#185FA5' },
                          { label: 'Fat', val: meal.fat, unit: 'g', color: '#FAEEDA', textColor: '#854F0B' },
                        ].map(m => (
                          <span key={m.label} style={{
                            fontSize: '12px', padding: '3px 9px', borderRadius: '20px',
                            background: m.color, color: m.textColor, fontWeight: '500'
                          }}>{m.val}g {m.label}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '20px', fontWeight: '700', color: 'var(--muted)',
                      fontFamily: 'Syne', marginLeft: '16px', whiteSpace: 'nowrap'
                    }}>
                      {meal.calories} <span style={{ fontSize: '12px', fontWeight: '400' }}>kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🥗</div>
                <p style={{ marginBottom: '16px' }}>No meal plan yet. Let AI generate one for you.</p>
                <a href="/plan">
                  <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
                    Generate my meal plan ✨
                  </button>
                </a>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Weight log */}
            <div className="card">
              <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Log today's weight</h3>
              <form onSubmit={logWeight}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number" step="0.1" min="30" max="300"
                    value={todayWeight}
                    onChange={e => setTodayWeight(e.target.value)}
                    placeholder={`${currentWeight || 75} kg`}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" style={{
                    background: 'var(--green)', color: 'white', padding: '10px 16px',
                    borderRadius: '8px', whiteSpace: 'nowrap', fontSize: '14px'
                  }}>Log</button>
                </div>
              </form>
              {logMsg && <p style={{ fontSize: '13px', color: 'var(--green)', marginTop: '8px' }}>{logMsg}</p>}

              {/* Mini chart */}
              {weightLogs.length > 1 && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Last {Math.min(weightLogs.length, 14)} entries</p>
                  <MiniSparkline logs={[...weightLogs].reverse().slice(-14)} />
                </div>
              )}
            </div>

            {/* Macro targets */}
            {macroTargets?.protein && (
              <div className="card">
                <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Daily targets</h3>
                {[
                  { label: 'Protein', val: macroTargets.protein, unit: 'g', color: 'var(--green)' },
                  { label: 'Carbs', val: macroTargets.carbs, unit: 'g', color: 'var(--blue)' },
                  { label: 'Fat', val: macroTargets.fat, unit: 'g', color: 'var(--amber)' },
                  { label: 'Calories', val: macroTargets.calories, unit: 'kcal', color: 'var(--coral)' },
                ].map(m => (
                  <div key={m.label} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--muted)' }}>{m.label}</span>
                      <span style={{ fontWeight: '500' }}>{m.val} {m.unit}</span>
                    </div>
                    <div style={{ height: '5px', background: '#f1f0ec', borderRadius: '3px' }}>
                      <div style={{ height: '100%', width: '100%', background: m.color, borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Syne', marginBottom: '2px', textTransform: 'capitalize' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'capitalize' }}>{sub}</div>
    </div>
  )
}

function MiniSparkline({ logs }) {
  if (logs.length < 2) return null
  const weights = logs.map(l => l.weight_kg)
  const min = Math.min(...weights) - 0.5
  const max = Math.max(...weights) + 0.5
  const W = 280, H = 60
  const points = weights.map((w, i) => {
    const x = (i / (weights.length - 1)) * W
    const y = H - ((w - min) / (max - min)) * H
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <polyline points={points} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={weights.length > 1 ? W : 0} cy={H - ((weights[weights.length - 1] - min) / (max - min)) * H} r="3" fill="var(--green)" />
    </svg>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
