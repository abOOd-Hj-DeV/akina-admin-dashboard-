import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

export function PageHeader({ title, sub, back, action }: { title: string; sub?: ReactNode; back?: boolean; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-[24px] font-bold text-[#1f1f21]">
          {back && (
            <Link to=".." relative="path" className="text-[#1d919e] no-underline">‹</Link>
          )}
          {title}
        </h1>
        {sub && <div className="mt-1 text-[14px] font-normal text-[#6b7280]">{sub}</div>}
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>{children}</div>
}

export function StatCard({ icon, label, value, sub, tint }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tint: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-[22px]" style={{ background: tint }}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-[#6b7280]">{label}</div>
        <div className="truncate text-[24px] font-bold leading-8 text-[#1f1f21]">{value}</div>
        {sub && <div className="text-[12px] font-normal text-[#6b7280]">{sub}</div>}
      </div>
    </Card>
  )
}

const badgeTones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-sky-50 text-sky-600',
  purple: 'bg-purple-50 text-purple-600',
  teal: 'bg-[#c7e4e7] text-[#1d656e]',
  gray: 'bg-gray-100 text-gray-500',
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium ${badgeTones[tone]}`}>{children}</span>
}

export function Chip({ icon, label, count, tone }: { icon: ReactNode; label: string; count: number; tone: keyof typeof badgeTones }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium ${badgeTones[tone]}`}>
      {icon}
      {label} ({count})
    </span>
  )
}

type BtnTone = 'primary' | 'danger' | 'danger-soft' | 'outline' | 'ghost' | 'green' | 'blue'
const btnTones: Record<BtnTone, string> = {
  primary: 'bg-[#1d919e] text-white hover:bg-[#187a85]',
  green: 'bg-emerald-500 text-white hover:bg-emerald-600',
  blue: 'bg-sky-500 text-white hover:bg-sky-600',
  danger: 'bg-[#fd4438] text-white hover:bg-red-600',
  'danger-soft': 'border border-[#fd4438]/40 bg-white text-[#fd4438] hover:bg-red-50',
  outline: 'border border-[#1d919e]/40 bg-white text-[#1d919e] hover:bg-[#c7e4e7]/40',
  ghost: 'text-[#1d919e] hover:bg-[#c7e4e7]/40',
}

export function Btn({ children, tone = 'primary', onClick, className = '', disabled }: {
  children: ReactNode; tone?: BtnTone; onClick?: () => void; className?: string; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold transition disabled:opacity-50 ${btnTones[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

export function SearchBar({ placeholder = 'ابحث...' }: { placeholder?: string }) {
  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <input
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 ps-10 text-[14px] outline-none focus:border-[#1d919e]"
          placeholder={placeholder}
        />
        <span className="absolute right-3 top-2.5 text-gray-400"><Icon name="search" size={18} /></span>
      </div>
      <Btn tone="outline"><Icon name="filter" size={16} /> تصفية</Btn>
    </div>
  )
}

export function Table({ cols, children }: { cols: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-[14px]">
        <thead>
          <tr className="border-b border-gray-100 text-[12px] font-medium text-[#6b7280]">
            {cols.map((c) => (
              <th key={c} className="px-3 py-3 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function ProgressBar({ value, tone = '#1d919e' }: { value: number; tone?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-200">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, background: tone }} />
      </span>
      <span className="text-[12px] font-medium text-[#6b7280]">{value}%</span>
    </span>
  )
}

export function Banner({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'red' | 'teal' | 'purple' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    teal: 'bg-[#c7e4e7] text-[#1d656e]',
    purple: 'bg-purple-50 text-purple-700',
  }
  return <div className={`mb-4 rounded-xl px-4 py-3 text-[14px] font-medium ${tones[tone]}`}>{children}</div>
}

export function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c7e4e7] text-[12px] font-bold text-[#1d656e]">
      {label.slice(0, 1)}
    </span>
  )
}
