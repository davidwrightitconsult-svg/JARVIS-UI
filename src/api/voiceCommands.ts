/**
 * voiceCommands — Alfred's situational awareness engine.
 */

import type { DashboardResponse } from './client'
import { api } from './client'

export interface CommandContext {
  navigate: (path: string) => void
  refreshDashboard: () => Promise<void>
  dashboard: DashboardResponse | null
}

export interface CommandResult {
  reply: string
  refresh?: boolean
}

interface ParsedCommand {
  intent: string
  matches: (text: string) => boolean
  handle: (ctx: CommandContext, transcript: string) => Promise<CommandResult>
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---- Number-to-words helpers ----

function numberToWords(n: number): string {
  if (n === 0) return 'zero'
  const negative = n < 0
  const abs = Math.abs(n)
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  const integerPart = Math.floor(abs)
  const decimalPart = Math.round((abs - integerPart) * 100)

  let words = ''
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000)
    if (thousands > 0) words += numberToWords(thousands) + ' thousand '
  }
  const hundreds = Math.floor((integerPart % 1000) / 100)
  if (hundreds > 0) words += ones[hundreds] + ' hundred '
  const remainder = integerPart % 100
  if (remainder > 0) {
    if (remainder < 20) words += ones[remainder]
    else {
      const t = Math.floor(remainder / 10)
      const o = remainder % 10
      words += tens[t] + (o > 0 ? '-' + ones[o] : '')
    }
  }
  words = words.trim()
  if (decimalPart > 0) {
    words += ' point '
    if (decimalPart < 20) words += ones[decimalPart]
    else {
      const t = Math.floor(decimalPart / 10)
      const o = decimalPart % 10
      words += tens[t] + (o > 0 ? ' ' + ones[o] : '')
    }
  }
  return (negative ? 'minus ' : '') + words
}

function dollarsToWords(n: number): string {
  if (n === 0) return 'zero dollars'
  const negative = n < 0
  const abs = Math.abs(n)
  const dollars = Math.floor(abs)
  const cents = Math.round((abs - dollars) * 100)
  let result = numberToWords(dollars) + ' dollar' + (dollars === 1 ? '' : 's')
  if (cents > 0) {
    result += ' and ' + numberToWords(cents) + ' cent' + (cents === 1 ? '' : 's')
  }
  return (negative ? 'minus ' : '') + result
}

function percentToWords(n: number): string {
  return numberToWords(n) + ' percent'
}

function formatSignal(signal: string): string {
  return signal.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

// ---- Command registry ----

const COMMANDS: ParsedCommand[] = [
  { intent: 'greeting',
    matches: (t) => /\b(hello|hi|hey|good (morning|afternoon|evening))\b/.test(normalize(t)),
    handle: async () => {
      const hour = new Date().getHours()
      if (hour < 12) return { reply: 'Good morning, sir. The markets are already restless, I see.' }
      if (hour < 18) return { reply: 'Good afternoon, sir. I hope the day has treated you kindly.' }
      return { reply: 'Good evening, sir. Shall we see if we can make a profit before the night is out?' }
    } },
  { intent: 'who_are_you',
    matches: (t) => /\b(who are you|what are you|what is your name)\b/.test(normalize(t)),
    handle: async () => {
      return { reply: 'I am J.A.R.V.I.S., sir. Just A Rather Very Intelligent System. I am here to monitor the markets, manage the risk, and offer commentary whether you ask for it or not.' }
    } },

  { intent: 'go_home',
    matches: (t) => /\b(go home|home|dashboard|main screen)\b/.test(normalize(t)),
    handle: async (ctx) => { ctx.navigate('/'); return { reply: 'Returning to the primary dashboard, sir.' } } },
  { intent: 'go_markets',
    matches: (t) => /\b(show markets|go to markets|open markets|markets page)\b/.test(normalize(t)),
    handle: async (ctx) => { ctx.navigate('/markets'); return { reply: 'Opening the market scanner, sir.' } } },
  { intent: 'go_trades',
    matches: (t) => /\b(show trades|go to trades|open trades|trades page)\b/.test(normalize(t)),
    handle: async (ctx) => { ctx.navigate('/trades'); return { reply: 'Opening the trade history.' } } },
  { intent: 'go_strategies',
    matches: (t) => /\b(show strategies|go to strategies|open strategies|strategies page)\b/.test(normalize(t)),
    handle: async (ctx) => { ctx.navigate('/strategies'); return { reply: 'The strategy registry, sir.' } } },
  { intent: 'go_research',
    matches: (t) => /\b(show research|go to research|open research|research page)\b/.test(normalize(t)),
    handle: async (ctx) => { ctx.navigate('/research'); return { reply: 'Opening the research library.' } } },
  { intent: 'go_settings',
    matches: (t) => /\b(show settings|go to settings|open settings|settings page)\b/.test(normalize(t)),
    handle: async (ctx) => { ctx.navigate('/settings'); return { reply: 'Opening the settings panel.' } } },

  { intent: 'query_balance',
    matches: (t) => /\b(balance|equity|how much money|account value|net worth)\b/.test(normalize(t)),
    handle: async (ctx) => {
      if (!ctx.dashboard) return { reply: 'Dashboard data not loaded yet, sir.' }
      const equity = ctx.dashboard.portfolio.equity ?? 0
      const cash = ctx.dashboard.portfolio.cash ?? 0
      const atRisk = ctx.dashboard.portfolio.at_risk ?? 0
      const bankroll = ctx.dashboard.portfolio.bankroll ?? 0
      const ret = ((equity - bankroll) / bankroll) * 100
      
      let reply = `Your current equity stands at ${dollarsToWords(equity)}, sir. `
      reply += `Of that, ${dollarsToWords(cash)} is in cash, and ${dollarsToWords(atRisk)} is currently at risk. `
      reply += `This represents a ${percentToWords(ret)} change from your starting bankroll. `
      return { reply }
    } },

  { intent: 'query_positions',
    matches: (t) => /\b(open positions|running trades|what.*trading|current trades|open trades)\b/.test(normalize(t)),
    handle: async (ctx) => {
      if (!ctx.dashboard) return { reply: 'Dashboard data not loaded yet, sir.' }
      const open = ctx.dashboard.portfolio.open_positions ?? 0
      const closed = ctx.dashboard.portfolio.closed_trades ?? 0
      const exposure = ctx.dashboard.portfolio.at_risk ?? 0
      
      if (open === 0) return { reply: `You have no open positions at present, sir. Your total exposure is zero.` }
      
      let reply = `You currently hold ${numberToWords(open)} open position${open === 1 ? '' : 's'} with a total of ${dollarsToWords(exposure)} at risk. `
      reply += `To date, you have closed ${numberToWords(closed)} trade${closed === 1 ? '' : 's'}. `
      return { reply }
    } },

  { intent: 'query_markets',
    matches: (t) => /\b(market status|what.*market|how many markets|market update)\b/.test(normalize(t)),
    handle: async (ctx) => {
      if (!ctx.dashboard || !ctx.dashboard.scanner.rows) return { reply: 'Dashboard data not loaded yet, sir.' }
      
      const rows = ctx.dashboard.scanner.rows
      const total = rows.length
      const withSignals = rows.filter(r => r.signals && r.signals.length > 0).length
      
      let reply = `I am currently tracking ${numberToWords(total)} markets, sir. `
      if (withSignals > 0) {
        reply += `${numberToWords(withSignals)} of them are showing active algorithmic signals. `
      } else {
        reply += `The markets are relatively quiet at present.`
      }
      return { reply }
    } },

  { intent: 'query_research',
    matches: (t) => /\b(search (the )?library|what do (the )?books say|search (the )?research)\b/.test(normalize(t)),
    handle: async (ctx, transcript) => {
      const query = transcript.replace(/\b(search|the|library|books|say|research|what|do)\b/gi, '').trim()
      
      if (!query) return { reply: 'What would you like me to search for in the library, sir?' }
      
      try {
        const res = await api.get(`/research/search?q=${encodeURIComponent(query)}&limit=1`)
        if (res.data && res.data.results && res.data.results.length > 0) {
          const hit = res.data.results[0]
          const snippet = (hit.text || '').substring(0, 250).trim()
          return { reply: `According to the library, sir: "${snippet}..."` }
        }
        return { reply: `I searched the library for "${query}", sir, but found nothing of relevance.` }
      } catch (e) {
        return { reply: 'I am afraid the research library is offline, sir.' }
      }
    } },

  { intent: 'query_vault',
    matches: (t) => /\b(check (the )?vault|what is in (the )?vault|recall from vault)\b/.test(normalize(t)),
    handle: async (ctx) => {
      if (!ctx.dashboard || !ctx.dashboard.library) return { reply: 'Dashboard data not loaded yet, sir.' }
      
      const lib = ctx.dashboard.library
      if (lib.error) {
        return { reply: 'The knowledge vault is currently disabled, sir.' }
      }
      
      return { reply: `The knowledge vault is active. Your notes are safe.` }
    } },

  { intent: 'scan_markets',
    matches: (t) => /\b(scan markets|run a scan|scan the markets|refresh markets|check markets)\b/.test(normalize(t)),
    handle: async (ctx) => {
      ctx.navigate('/markets')
      try {
        await api.post('/command', { command: 'scan' })
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await ctx.refreshDashboard()

        if (!ctx.dashboard || !ctx.dashboard.scanner.rows) {
          return { reply: 'Scan complete, but I could not retrieve the fresh data.' }
        }

        const rows = ctx.dashboard.scanner.rows
        const topVol = [...rows].sort((a, b) => b.volume_24h - a.volume_24h)[0]
        const withSignals = rows.filter(r => r.signals && r.signals.length > 0)
        
        let reply = `Scan complete, sir. I have navigated to the markets page. `
        if (topVol) {
          reply += `The most active market by volume is "${topVol.question}". `
        }
        
        if (withSignals.length > 0) {
          reply += `I am detecting active signals on ${numberToWords(withSignals.length)} markets. `
        } else {
          reply += `No actionable signals detected. `
        }
        return { reply, refresh: true }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error'
        return { reply: 'The market scan has failed, sir. ' + msg }
      }
    } },
]

export async function dispatchVoiceCommand(
  transcript: string,
  context: CommandContext,
): Promise<CommandResult | null> {
  if (!transcript || !transcript.trim()) return null
  for (const cmd of COMMANDS) {
    if (cmd.matches(transcript)) {
      return cmd.handle(context, transcript)
    }
  }
  return null
}

export function unknownCommandReply(transcript: string): string {
  return 'I did not understand "' + transcript + '", sir. Perhaps try again with clearer diction.'
}
