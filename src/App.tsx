import BayouPipeline from './bayou-pipeline'
import { AuthProvider, LoginScreen, useAuth } from './lib/auth'

function Gate() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Aptos Narrow','Segoe UI',system-ui,sans-serif",
        color: '#6B7280',
        fontSize: 12,
      }}>Loading…</div>
    )
  }
  if (!user) return <LoginScreen />
  return <BayouPipeline />
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

export default App
