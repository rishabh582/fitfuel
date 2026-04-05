import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STEPS = ['basics', 'body', 'fitness', 'food', 'done']

const WORKOUT_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: '0–1 year, 2–3x/week' },
  { id: 'intermediate', label: 'Intermediate', desc: '1–3 years, 3–4x/week' },
  { id: 'advanced', label: 'Advanced', desc: '3+ years, 5–6x/week' },
]

const GOALS = [
  { id: 'muscle', label: 'Build Muscle', emoji: '💪' },
  { id: 'fat_loss', label: 'Lose Fat', emoji: '🔥' },
  { id: 'recomp', label: 'Body Recomp', emoji: '⚡' },
  { id: 'maintain', label: 'Maintain & Tone', emoji: '🎯' },
]

const DIETS = [
  { id: 'omnivore', label: 'Omnivore' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'eggetarian', label: 'Eggetarian' },
  { id: 'pescatarian', label: 'Pescatarian' },
]

const CUISINES = [
  'Indian', 'Mediterranean', 'East Asian', 'American',
  'Middle Eastern', 'European', 'Latin American', 'Southeast Asian'
]

const ALLERGIES = ['Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs', 'Shellfish']

export default function OnboardingPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    name: '',
    age: '',
    gender: '',
    region: '',
    height_cm: '',
    weight_kg: '',
    goal: '',
    workout_level: '',
    workout_days: 4,
    diet_type: '',
    cuisines: [],
    allergies: [],
    meals_per_day: 4,
  })

  function set(key, val) { setData(d => ({ ...d, [key]: val })) }
  function toggleArr(key, val) {
    setData(d => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter(x => x !== val) : [...d[key], val]
    }))
  }

  async function finish() {
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...data,
      age: parseInt(data.age),
      height_cm: parseFloat(data.height_cm),
      weight_kg: parseFloat(data.weight_kg),
      workout_days: parseInt(data.workout_days),
      meals_per_day: parseInt(data.meals_per_day),
      onboarded: true,
    })
    if (error) { alert('Error saving: ' + error.message); setSaving(false); return }
    // Also create initial weight log entry
    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight_kg: parseFloat(data.weight_kg),
      logged_at: new Date().toISOString().split('T')[0]
    })
    setSaving(false)
    window.location.reload()
  }

  const prog = ((step) / (STEPS.length - 1)) * 100

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      background: 'linear-gradient(135deg, #f8f7f4 0%, #e8f5ef 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>
            Fit<span style={{ color: 'var(--green)' }}>Fuel</span>
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Let's set up your personal plan</p>
        </div>

        {/* Progress bar */}
        <div style={{
          height: '4px', background: '#e0e0db', borderRadius: '2px',
          marginBottom: '32px', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', background: 'var(--green)',
            width: `${prog}%`, transition: 'width 0.4s ease',
            borderRadius: '2px'
          }} />
        </div>

        <div className="card" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* STEP 0: Basics */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Welcome! What's your name?</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>A few quick questions to personalise your experience.</p>
              <div style={{ marginBottom: '16px' }}>
                <label className="label">Your name</label>
                <input value={data.name} onChange={e => set('name', e.target.value)} placeholder="Alex" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="label">Age</label>
                <input type="number" value={data.age} onChange={e => set('age', e.target.value)} placeholder="25" min="14" max="80" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="label">Gender</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <button key={g} onClick={() => set('gender', g.toLowerCase())}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px',
                        background: data.gender === g.toLowerCase() ? 'var(--green-light)' : '#f5f4f0',
                        color: data.gender === g.toLowerCase() ? 'var(--green-dark)' : 'var(--muted)',
                        border: data.gender === g.toLowerCase() ? '1.5px solid var(--green)' : '1px solid transparent',
                        fontWeight: data.gender === g.toLowerCase() ? '500' : '400'
                      }}>{g}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="label">Your country / region</label>
                <input value={data.region} onChange={e => set('region', e.target.value)} placeholder="e.g. India, USA, UK..." />
              </div>
              <button className="btn-primary" onClick={() => setStep(1)}
                disabled={!data.name || !data.age || !data.gender || !data.region}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP 1: Body */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Your body stats</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>Used to calculate your calorie and macro targets accurately.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="label">Height (cm)</label>
                  <input type="number" value={data.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="175" />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input type="number" value={data.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="75" />
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="label">Primary goal</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {GOALS.map(g => (
                    <button key={g.id} onClick={() => set('goal', g.id)} style={{
                      padding: '14px', borderRadius: '10px', fontSize: '14px', textAlign: 'left',
                      background: data.goal === g.id ? 'var(--green-light)' : '#f5f4f0',
                      border: data.goal === g.id ? '1.5px solid var(--green)' : '1px solid transparent',
                      color: data.goal === g.id ? 'var(--green-dark)' : 'var(--text)',
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{g.emoji}</div>
                      <div style={{ fontWeight: '500' }}>{g.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setStep(0)} style={{ flex: 1 }}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(2)}
                  disabled={!data.height_cm || !data.weight_kg || !data.goal}
                  style={{ flex: 2 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 2: Fitness */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Your workout routine</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>This helps calibrate how many calories you actually burn.</p>
              <div style={{ marginBottom: '20px' }}>
                <label className="label">Experience level</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {WORKOUT_LEVELS.map(l => (
                    <button key={l.id} onClick={() => set('workout_level', l.id)} style={{
                      padding: '14px 16px', borderRadius: '10px', textAlign: 'left',
                      background: data.workout_level === l.id ? 'var(--green-light)' : '#f5f4f0',
                      border: data.workout_level === l.id ? '1.5px solid var(--green)' : '1px solid transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '500', fontSize: '15px', color: data.workout_level === l.id ? 'var(--green-dark)' : 'var(--text)' }}>{l.label}</span>
                      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{l.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="label">Workout days per week: <strong>{data.workout_days}</strong></label>
                <input type="range" min="1" max="7" value={data.workout_days}
                  onChange={e => set('workout_days', e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--green)', marginTop: '8px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  <span>1 day</span><span>7 days</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(3)}
                  disabled={!data.workout_level}
                  style={{ flex: 2 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Food */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Food preferences</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>We'll suggest meals that you'll actually enjoy eating.</p>
              <div style={{ marginBottom: '20px' }}>
                <label className="label">Diet type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DIETS.map(d => (
                    <button key={d.id} onClick={() => set('diet_type', d.id)} style={{
                      padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
                      background: data.diet_type === d.id ? 'var(--green)' : '#f5f4f0',
                      color: data.diet_type === d.id ? 'white' : 'var(--muted)',
                      border: 'none', fontWeight: data.diet_type === d.id ? '500' : '400'
                    }}>{d.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="label">Cuisine preferences (pick all you like)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {CUISINES.map(c => (
                    <button key={c} onClick={() => toggleArr('cuisines', c)} style={{
                      padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
                      background: data.cuisines.includes(c) ? 'var(--green)' : '#f5f4f0',
                      color: data.cuisines.includes(c) ? 'white' : 'var(--muted)',
                      border: 'none', fontWeight: data.cuisines.includes(c) ? '500' : '400'
                    }}>{c}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="label">Allergies / intolerances</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ALLERGIES.map(a => (
                    <button key={a} onClick={() => toggleArr('allergies', a)} style={{
                      padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
                      background: data.allergies.includes(a) ? '#E24B4A' : '#f5f4f0',
                      color: data.allergies.includes(a) ? 'white' : 'var(--muted)',
                      border: 'none'
                    }}>{a}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="label">Meals per day: <strong>{data.meals_per_day}</strong></label>
                <input type="range" min="2" max="6" value={data.meals_per_day}
                  onChange={e => set('meals_per_day', e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--green)', marginTop: '8px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  <span>2 meals</span><span>6 meals</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(4)}
                  disabled={!data.diet_type}
                  style={{ flex: 2 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
              <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>You're all set, {data.name}!</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '32px', lineHeight: '1.6' }}>
                We'll now use AI to generate your personalised meal plan based on your body stats, goals, and food preferences.
              </p>
              <div className="card" style={{ textAlign: 'left', background: '#f5f4f0', border: 'none', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--muted)' }}>Goal</span><span style={{ fontWeight: '500' }}>{GOALS.find(g => g.id === data.goal)?.label}</span>
                  <span style={{ color: 'var(--muted)' }}>Level</span><span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{data.workout_level}</span>
                  <span style={{ color: 'var(--muted)' }}>Weight</span><span style={{ fontWeight: '500' }}>{data.weight_kg} kg</span>
                  <span style={{ color: 'var(--muted)' }}>Diet</span><span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{data.diet_type}</span>
                  <span style={{ color: 'var(--muted)' }}>Cuisine</span><span style={{ fontWeight: '500' }}>{data.cuisines.slice(0,2).join(', ') || 'Any'}</span>
                  <span style={{ color: 'var(--muted)' }}>Meals/day</span><span style={{ fontWeight: '500' }}>{data.meals_per_day}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setStep(3)} style={{ flex: 1 }}>← Back</button>
                <button className="btn-primary" onClick={finish} disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Saving...' : 'Generate my plan ✨'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '16px' }}>
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  )
}
