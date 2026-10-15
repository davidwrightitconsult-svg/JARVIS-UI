/**
 * Sidebar — persistent navigation.
 *
 * Uses NavLink so the active route highlights automatically.
 * Icons are from lucide-react; labels appear in the tooltip.
 */

import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Brain as BrainIcon,
  Home,
  LineChart,
  ScrollText,
  Settings as SettingsIcon,
  Shield,
  Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/markets', icon: LineChart, label: 'Markets' },
  { to: '/trades', icon: Zap, label: 'Trades' },
  { to: '/strategies', icon: BrainIcon, label: 'Strategies' },
  { to: '/research', icon: ScrollText, label: 'Research' },
  { to: '/library', icon: BookOpen, label: 'Library' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-16 bg-jarvis-panel border-r border-jarvis-border flex flex-col items-center py-4 gap-1">
      {/* Logo / brand icon at top */}
      <div className="mb-6">
        <div className="w-10 h-10 rounded-lg bg-jarvis-bg border border-jarvis-cyan/30 flex items-center justify-center shadow-glow-sm">
          <Shield className="w-5 h-5 text-jarvis-cyan" />
        </div>
      </div>

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          title={item.label}
          className={({ isActive }) =>
            `w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30'
                : 'text-jarvis-textDim hover:text-jarvis-cyan hover:bg-jarvis-cyan/5'
            }`
          }
        >
          <item.icon className="w-5 h-5" />
        </NavLink>
      ))}
    </aside>
  )
}
