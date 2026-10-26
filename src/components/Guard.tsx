import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { access, homeFor } from '../auth/permissions'
import type { Screen } from '../types'
import { Btn } from './ui'
import Icon from './Icon'
import { Link } from 'react-router-dom'

function Unauthorized() {
  const { role } = useAuth()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-50 text-4xl"><Icon name="shield" size={40} className="text-purple-400" /></div>
      <h2 className="text-[24px] font-bold text-[#1f1f21]">غير مصرح</h2>
      <p className="mt-2 max-w-md text-[14px] text-[#6b7280]">
        هذه الصفحة غير متاحة لصلاحية دورك الحالي.
      </p>
      <Link to={`/${role ? homeFor(role) : 'login'}`}>
        <Btn className="mt-6">العودة للوحة التحكم</Btn>
      </Link>
    </div>
  )
}

export default function Guard({ screen, children }: { screen: Screen; children: ReactNode }) {
  const { role } = useAuth()
  if (!role) return <Navigate to="/login" replace />
  if (access(role, screen).level === 'denied') return <Unauthorized />
  return <>{children}</>
}
