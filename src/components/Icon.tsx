/** أيقونات SVG بخط رفيع — بديل الإيموجي لتطابق مسطح وثابت على كل الأنظمة */
import type { SVGProps } from 'react'

const paths: Record<string, string> = {
  dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  users: 'M16 19c0-3-3.6-4.5-6-4.5S4 16 4 19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 8.5a3 3 0 1 1 2.6-4.5M17.5 14.5c2.4.4 4.5 2 4.5 4.5',
  stetho: 'M6 4v6a6 6 0 0 0 12 0V4M9 4H5M19 4h-4M12 16v3a4 4 0 0 0 8 0v-1',
  card: 'M3 7h18v11H3zM3 11h18M7 15h4',
  clinical: 'M12 4v16M6 9c0 5 2.5 8 6 8s6-3 6-8M12 4a2 2 0 1 0 0 .1M7 21h10',
  flag: 'M5 21V4M5 4c4-2 8 2 14 0v9c-6 2-10-2-14 0',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 0 3 3h11',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h5M10 17h5',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-7M20 16V5',
  ticket: 'M4 8a2 2 0 0 1 0 8v2h16v-2a2 2 0 0 1 0-8V6H4zM14 6v12',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1',
  alert: 'M12 4L2.5 20h19zM12 10v4M12 17.5v.1',
  warn: 'M12 8v5M12 16.5v.1M10.3 3.6L2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z',
  check: 'M4 12l5 5L20 6',
  x: 'M6 6l12 12M18 6L6 18',
  phone: 'M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v3',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  receipt: 'M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6',
  search: 'M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM16 16l5 5',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3',
  money: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 10c0-1.5 1.5-2.5 3-2.5s3 .8 3 2c0 3-6 1.5-6 4.5 0 1.2 1.5 2 3 2s3-1 3-2.5M12 6v1.5M12 16v1.5',
  calendar: 'M5 6h14v14H5zM8 3v4M16 3v4M5 10h14',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  arrow: 'M15 6l-6 6 6 6',
  mail: 'M4 5h16v14H4zM4 7l8 6 8-6',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 3 5 3 3 0 0 0 5 1V6a3 3 0 0 0-3-2zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-3 5 3 3 0 0 1-5 1',
  up: 'M7 17L17 7M9 7h8v8',
}

export default function Icon({ name, size = 20, ...rest }: { name: keyof typeof paths | string } & SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d={paths[name] ?? paths.doc} />
    </svg>
  )
}
