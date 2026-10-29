import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import Shell from './components/Shell'
import Guard from './components/Guard'
import Login from './screens/Login'
import Activate from './screens/Activate'
import Dashboard from './screens/Dashboard'
import Patients from './screens/Patients'
import PatientProfile from './screens/PatientProfile'
import Therapists from './screens/Therapists'
import Clinical from './screens/Clinical'
import Payments from './screens/Payments'
import Programs from './screens/Programs'
import DocRequests from './screens/DocRequests'
import RedFlags from './screens/RedFlags'
import Reports from './screens/Reports'
import Audit from './screens/Audit'
import Settings from './screens/Settings'
import Tickets from './screens/Tickets'
import Faqs from './screens/Faqs'
import Users from './screens/Users'
import type { Screen } from './types'

const ROUTES: { screen: Screen; el: ReactElement }[] = [
  { screen: 'dashboard', el: <Dashboard /> },
  { screen: 'patients', el: <Patients /> },
  { screen: 'patient-profile', el: <PatientProfile /> },
  { screen: 'therapists', el: <Therapists /> },
  { screen: 'clinical', el: <Clinical /> },
  { screen: 'payments', el: <Payments /> },
  { screen: 'programs', el: <Programs /> },
  { screen: 'doc-requests', el: <DocRequests /> },
  { screen: 'red-flags', el: <RedFlags /> },
  { screen: 'reports', el: <Reports /> },
  { screen: 'audit', el: <Audit /> },
  { screen: 'settings', el: <Settings /> },
  { screen: 'tickets', el: <Tickets /> },
  { screen: 'faqs', el: <Faqs /> },
  { screen: 'users', el: <Users /> },
]

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/activate" element={<Activate />} />
          <Route element={<Shell />}>
            {ROUTES.map((r) => (
              <Route key={r.screen} path={`/${r.screen}`} element={<Guard screen={r.screen}>{r.el}</Guard>} />
            ))}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
