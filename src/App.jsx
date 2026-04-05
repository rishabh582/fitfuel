import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import Dashboard from './pages/Dashboard'
import PlanPage from './pages/PlanPage'
import ProgressPage from './pages/ProgressPage'

function AppRoutes() {
  const { user, loading } = useAuth()
  const [onboarded, setOnboarded] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!user) { setChecking(false); setOnboarded(null); return }
    supabase.from('profiles').select('onboarded').eq('id', user.id).single()
      .then(({ data }) => {
        setOnboarded(data?.onboarded || false)
        setChecking(false)
      })
  }, [user])

  if (loading || checking) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ fontSize: '28px', fontFamily: 'Syne', fontWeight: '800' }}>
          Fit<span style={{ color: '#1D9E75' }}>Fuel</span>
        </div>
        <p style={{ color: '#888', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  if (!user) return <AuthPage />
  if (!onboarded) return <OnboardingPage />

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
