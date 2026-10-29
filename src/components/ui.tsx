import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

export function PageHeader({ title, sub, back, action }: { title: string; sub?: ReactNode; back?: boolean; action?: ReactNode }) {
  // العنوان الرئيسي يعيش في الشريط العلوي (نفس تخطيط داشبورد المعالج) — هنا سطر وصفي وزر إجراء فقط
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h2 className="sr-only">{title}</h2>
        <div className="flex items-center gap-2 text-[14px] font-normal text-[#657381]">
          {back && (
            <Link to=".." relative="path" className="icon-button !h-8 !w-8" aria-label="رجوع">
              <Icon name="arrow" size={16} />
            </Link>
          )}
          {sub}
        </div>
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#eff0f0] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tint?: string }) {
  return (
    <Card className="flex min-h-[92px] items-center gap-5">
      <span className="featured-icon"><span>{icon}</span></span>
      <div className="min-w-0">
        <div className="text-[14px] font-normal leading-5 text-[#657381]">{label}</div>
        <div className="truncate text-[24px] font-semibold leading-8 tracking-[-0.5px] text-[#0a0a0a]">{value}</div>
        {sub && <div className="text-[12px] font-normal text-[#657381]">{sub}</div>}
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
  teal: 'bg-[#e7f4f5] text-[#135e66]',
  gray: 'bg-gray-100 text-gray-500',
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${badgeTones[tone]}`}>{children}</span>
}

export function Chip({ icon, label, count, tone }: { icon: ReactNode; label: string; count: number; tone: keyof typeof badgeTones }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${badgeTones[tone]}`}>
      {icon}
      {label} ({count})
    </span>
  )
}

type BtnTone = 'primary' | 'danger' | 'danger-soft' | 'outline' | 'ghost' | 'green' | 'blue'
const btnClasses: Record<BtnTone, string> = {
  primary: 'teal-button',
  green: 'teal-button',
  blue: 'soft-button',
  outline: 'soft-button',
  'danger-soft': 'soft-button !border-[#fd4438]/40 !text-[#fd4438] hover:!bg-red-50',
  danger: 'inline-flex min-h-[36px] items-center justify-center gap-2 rounded-xl border-0 bg-[#fd4438] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50',
  ghost: 'inline-flex min-h-[36px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-[#1d919e] transition hover:bg-[#e7f4f5] disabled:opacity-50',
}

export function Btn({ children, tone = 'primary', onClick, className = '', disabled }: {
  children: ReactNode; tone?: BtnTone; onClick?: () => void; className?: string; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${btnClasses[tone]} ${className}`}>
      {children}
    </button>
  )
}

export function SearchBar({ placeholder = 'ابحث...' }: { placeholder?: string }) {
  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <input
          className="w-full rounded-xl border border-[#ebebeb] bg-white px-4 py-2.5 ps-10 text-[14px] outline-none focus:border-[#1d919e]"
          placeholder={placeholder}
        />
        <span className="absolute right-3 top-2.5 text-[#657381]"><Icon name="search" size={18} /></span>
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
          <tr className="bg-[#f8f8f8] text-[13px] font-normal text-[#657381]">
            {cols.map((c, i) => (
              <th
                key={c}
                className={`h-10 px-3 font-normal ${i === 0 ? 'rounded-s-lg' : ''} ${i === cols.length - 1 ? 'rounded-e-lg' : ''}`}
              >
                {c}
              </th>
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
      <span className="text-[12px] font-medium text-[#657381]">{value}%</span>
    </span>
  )
}

export function Banner({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'red' | 'teal' | 'purple' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    teal: 'bg-[#e7f4f5] text-[#135e66]',
    purple: 'bg-purple-50 text-purple-700',
  }
  return <div className={`mb-4 rounded-xl px-4 py-3 text-[14px] font-medium ${tones[tone]}`}>{children}</div>
}

export function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f4f5] text-[12px] font-bold text-[#135e66]">
      {label.slice(0, 1)}
    </span>
  )
}
