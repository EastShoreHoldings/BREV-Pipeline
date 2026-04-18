import BayouPipeline from './bayou-pipeline'
import { AuthProvider, LoginScreen, SetNewPasswordScreen, useAuth } from './lib/auth'

function Gate() {
  const { user, loading, recoveryMode } = useAuth()
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
  // User clicked a password-reset email link → show the "set new password" form
  // even if they're technically authenticated (recovery session).
  if (recoveryMode) return <SetNewPasswordScreen />
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
