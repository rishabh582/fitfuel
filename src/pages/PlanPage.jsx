import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Nav from '../components/Nav'

export default function PlanPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [mealPlan, setMealPlan] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: prof }, { data: plan }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('meal_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      ])
      setProfile(prof)
      setMealPlan(plan)
      setLoading(false)
    }
    load()
  }, [user.id])

  async function generatePlan() {
    setGenerating(true)
    setError('')

    try {
      const prompt = buildPrompt(profile)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await response.json()
      const text = data.content[0].text

      // Extract JSON from response
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/)
      if (!jsonMatch) throw new Error('Could not parse AI response')

      const planData = JSON.parse(jsonMatch[1])

      // Save to Supabase
      const { data: saved, error: saveErr } = await supabase.from('meal_plans').insert({
        user_id: user.id,
        plan_data: planData,
        generated_at: new Date().toISOString()
      }).select().single()

      if (saveErr) throw saveErr
      setMealPlan(saved)
    } catch (err) {
      setError('Failed to generate plan: ' + err.message)
      console.error(err)
    }
    setGenerating(false)
  }

  function buildPrompt(p) {
    // Calculate TDEE
    const bmr = p.gender === 'male'
      ? 88.36 + (13.4 * p.weight_kg) + (4.8 * p.height_cm) - (5.7 * p.age)
      : 447.6 + (9.2 * p.weight_kg) + (3.1 * p.height_cm) - (4.3 * p.age)

    const activityMults = { beginner: 1.375, intermediate: 1.55, advanced: 1.725 }
    const tdee = Math.round(bmr * (activityMults[p.workout_level] || 1.55))
    const targetCals = p.goal === 'muscle' ? tdee + 300 : p.goal === 'fat_loss' ? tdee - 400 : tdee

    return `You are a professional sports nutritionist. Create a personalised daily meal plan for this person:

- Name: ${p.name}, Age: ${p.age}, Gender: ${p.gender}
- Country/Region: ${p.region}
- Height: ${p.height_cm}cm, Weight: ${p.weight_kg}kg
- Goal: ${p.goal} (${p.goal === 'muscle' ? 'build muscle mass' : p.goal === 'fat_loss' ? 'lose body fat while preserving muscle' : 'body recomposition'})
- Workout level: ${p.workout_level}, ${p.workout_days} days/week
- Diet type: ${p.diet_type}
- Cuisine preferences: ${p.cuisines?.join(', ') || 'any'}
- Allergies: ${p.allergies?.length ? p.allergies.join(', ') : 'none'}
- Meals per day: ${p.meals_per_day}
- Estimated daily calorie target: ${targetCals} kcal

Create a realistic, practical meal plan using REAL foods common in ${p.region}. 
Each meal should have specific food items with quantities (grams/cups etc).

Respond ONLY with valid JSON in this exact format:
\`\`\`json
{
  "targets": {
    "calories": ${targetCals},
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fat": <number in grams>
  },
  "meals": [
    {
      "name": "Breakfast",
      "time": "7:30 AM",
      "description": "<specific food items with quantities>",
      "calories": <number>,
      "protein": <number>,
      "carbs": <number>,
      "fat": <number>
    }
  ],
  "tips": ["tip1", "tip2", "tip3"],
  "hydration": "<water intake recommendation>"
}
\`\`\`

Make sure protein is high (${p.goal === 'muscle' ? '2.0-2.2' : '1.8-2.0'}g per kg bodyweight = ${Math.round(p.weight_kg * (p.goal === 'muscle' ? 2.1 : 1.9))}g).
Use foods that are AFFORDABLE and EASILY AVAILABLE in ${p.region}.`
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Loading...</p>
    </div>
  )

  let plan = null
  try {
    plan = typeof mealPlan?.plan_data === 'string' ? JSON.parse(mealPlan.plan_data) : mealPlan?.plan_data
  } catch (e) {}

  return (
    <>
      <Nav profile={profile} />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800' }}>Your Meal Plan</h1>
            {mealPlan && (
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
                Generated {new Date(mealPlan.generated_at || mealPlan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          <button
            onClick={generatePlan}
            disabled={generating}
            style={{
              background: generating ? '#ccc' : 'var(--green)', color: 'white',
              padding: '10px 20px', borderRadius: '10px', fontSize: '14px',
              fontWeight: '500', border: 'none', cursor: generating ? 'not-allowed' : 'pointer'
            }}
          >
            {generating ? '✨ Generating...' : mealPlan ? '↻ Regenerate' : '✨ Generate with AI'}
          </button>
        </div>

        {generating && (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⚡</div>
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>AI is crafting your plan...</p>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Calculating macros, picking foods from your region...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '14px', color: '#A32D2D' }}>
            {error}
          </div>
        )}

        {plan && !generating && (
          <div>
            {/* Macro targets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '28px' }}>
              {[
                { label: 'Calories', val: plan.targets?.calories, unit: 'kcal', color: '#FAECE7', text: '#993C1D' },
                { label: 'Protein', val: plan.targets?.protein, unit: 'g', color: '#E1F5EE', text: '#0F6E56' },
                { label: 'Carbs', val: plan.targets?.carbs, unit: 'g', color: '#E6F1FB', text: '#185FA5' },
                { label: 'Fat', val: plan.targets?.fat, unit: 'g', color: '#FAEEDA', text: '#854F0B' },
              ].map(m => (
                <div key={m.label} style={{ background: m.color, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: m.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'Syne', color: m.text }}>{m.val}</div>
                  <div style={{ fontSize: '11px', color: m.text, opacity: 0.7 }}>{m.unit}</div>
                </div>
              ))}
            </div>

            {/* Meals */}
            <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>Daily meals</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {plan.meals?.map((meal, i) => (
                <div key={i} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {meal.name} · {meal.time}
                      </span>
                      <p style={{ fontSize: '15px', fontWeight: '500', marginTop: '4px' }}>{meal.description}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Syne' }}>{meal.calories}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>kcal</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { n: 'Protein', v: meal.protein, bg: '#E1F5EE', c: '#0F6E56' },
                      { n: 'Carbs', v: meal.carbs, bg: '#E6F1FB', c: '#185FA5' },
                      { n: 'Fat', v: meal.fat, bg: '#FAEEDA', c: '#854F0B' },
                    ].map(m => (
                      <span key={m.n} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: m.bg, color: m.c, fontWeight: '500' }}>
                        {m.v}g {m.n}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            {plan.tips?.length > 0 && (
              <div className="card" style={{ background: '#F5FBF8', border: '1px solid #9FE1CB' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--green-dark)' }}>💡 Nutrition tips for you</h3>
                {plan.tips.map((tip, i) => (
                  <p key={i} style={{ fontSize: '14px', color: '#0F6E56', marginBottom: '6px', paddingLeft: '12px', borderLeft: '2px solid var(--green)' }}>
                    {tip}
                  </p>
                ))}
                {plan.hydration && (
                  <p style={{ fontSize: '14px', color: '#0F6E56', marginTop: '10px', paddingLeft: '12px', borderLeft: '2px solid var(--green)' }}>
                    💧 {plan.hydration}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!plan && !generating && (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥗</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No plan generated yet</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
              Click "Generate with AI" to create your personalised meal plan based on your body stats, goals and food preferences.
            </p>
            <button className="btn-primary" onClick={generatePlan} style={{ width: 'auto', padding: '12px 32px' }}>
              ✨ Generate my plan
            </button>
          </div>
        )}
      </div>
    </>
  )
}
