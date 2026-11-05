// The Inbox: the sidebar's nine mail subjects (verbatim from the video) with short, neutral,
// fictional late-2003 messages; plus the folders' state from the log:
//   'mail.read' { key }  'mail.unread' { key }  'mail.delete' { key }  'mail.purge' { key }
//   'mail.restore' { key }  'mail.send' { to, cc, subject, body }  'mail.draft' { to, cc, subject, body }
import { getLog, getVersion } from '../../core/events.js'

export const INBOX = [
  { key: 'm0', from: 'Anthony Ruiz', addr: 'anthony.ruiz@hotmail.com', subject: 'Last time we met', when: 'Wed 11/5/2003 9:14 AM', unread: true, body: 'Hi Sondra,\n\nIt was good to catch up last time we met. Let me know when you are free for lunch next week, Tuesday or Thursday works for me.\n\nAnthony' },
  { key: 'm1', from: 'Hotmail Staff', addr: 'staff@hotmail.com', subject: 'Hotmail Service', when: 'Wed 11/5/2003 7:02 AM', unread: true, body: 'Thank you for using Hotmail.\n\nYour account is ready to use with Outlook. Mail you receive is kept in your Inbox until you delete it. To keep your account active, sign in at least once every 30 days.\n\nThe Hotmail Team' },
  { key: 'm2', from: 'Kathy Morgan', addr: 'kathy.m@hotmail.com', subject: 'Hello', when: 'Tue 11/4/2003 8:47 PM', unread: true, body: 'Hello!\n\nJust saying hi from the new place. The boxes are almost all unpacked. Come and visit when you can.\n\nKathy' },
  { key: 'm3', from: 'Harold Becker', addr: 'harold.b@hotmail.com', subject: 'Information for you', when: 'Tue 11/4/2003 3:20 PM', body: 'Sondra,\n\nHere is the information for the book club: we meet on the second Monday of each month at 7:00 PM. This month we are reading a short mystery, about 250 pages.\n\nHarold' },
  { key: 'm4', from: 'Hank Ellis', addr: 'hank.ellis@hotmail.com', subject: 'You Gotta check this out', when: 'Mon 11/3/2003 6:41 PM', body: 'You gotta check this out: the new trail along the river is finally open. Flat, paved and about five miles long. Perfect for a Saturday ride.\n\nHank' },
  { key: 'm5', from: 'Justin Park', addr: 'justin.park@hotmail.com', subject: 'Yesterday', when: 'Mon 11/3/2003 10:05 AM', body: 'Thanks again for yesterday. The pictures from the afternoon came out well, I will put them on a CD for you.\n\nJustin' },
  { key: 'm6', from: 'Roger Chan', addr: 'roger.cc@hotmail.com', subject: 'Funny Thing', when: 'Sun 11/2/2003 4:33 PM', body: 'Funny thing happened at the store today: I ran into three people from our old office in the same aisle. Small world.\n\nRoger' },
  { key: 'm7', from: 'Kathy Morgan', addr: 'kathy.m@hotmail.com', subject: 'Hi Jeff', when: 'Sat 11/1/2003 11:12 AM', body: 'Hi Jeff,\n\nOops, this was meant for Jeff! Please ignore it, or tell him the potluck starts at six.\n\nKathy' },
  { key: 'm8', from: 'Gary Monroe', addr: 'gmonster@hotmail.com', subject: 'Just in Time', when: 'Fri 10/31/2003 5:58 PM', body: 'Your package arrived just in time. Thanks for sending it so quickly!\n\nGary' },
]

export const FOLDERS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'sent', label: 'Sent Items' },
  { key: 'deleted', label: 'Deleted Items' },
  { key: 'junk', label: 'Junk E-mail' },
  { key: 'outbox', label: 'Outbox' },
]

const TYPES = new Set(['win.open', 'mail.read', 'mail.unread', 'mail.delete', 'mail.purge', 'mail.restore', 'mail.send', 'mail.draft', 'login.submit'])
let cache = { v: -1, t: -1, s: null }
const fmt = (d) => d

// { folders: { inbox: [msg], ... }, unread: Set }
export function mailState(t) {
  const v = getVersion()
  if (cache.v === v && cache.t === t) return cache.s
  const read = new Set()
  const unreadOverride = new Set()
  const deleted = new Map() // key -> from folder
  const purged = new Set()
  const sent = []
  const drafts = []
  for (const e of getLog()) {
    if (e.t > t) break
    if (!TYPES.has(e.type)) continue
    switch (e.type) {
      case 'win.open': {
        // opening the Inbox on a message (sidebar mail items) reads it
        const m = e.props?.message != null && (e.app === 'outlook' || e.id === 'inbox') ? messageFor(e.props.message) : null
        if (m) read.add(m.key)
        break
      }
      case 'login.submit':
        // each session starts from the same mailbox
        read.clear()
        unreadOverride.clear()
        deleted.clear()
        purged.clear()
        sent.length = 0
        drafts.length = 0
        break
      case 'mail.read':
        read.add(e.key)
        unreadOverride.delete(e.key)
        break
      case 'mail.unread':
        unreadOverride.add(e.key)
        read.delete(e.key)
        break
      case 'mail.delete':
        if (deleted.has(e.key)) purged.add(e.key)
        else deleted.set(e.key, e.from || 'inbox')
        break
      case 'mail.purge':
        purged.add(e.key)
        break
      case 'mail.restore':
        deleted.delete(e.key)
        break
      case 'mail.send':
      case 'mail.draft': {
        const m = {
          key: (e.type === 'mail.send' ? 'sent:' : 'draft:') + Math.round(e.t * 1000),
          from: e.fromName || 'Sondra',
          addr: e.to || '',
          to: e.to || '',
          cc: e.cc || '',
          subject: e.subject || '(no subject)',
          when: fmt(e.when || 'Wed 11/5/2003'),
          body: e.body || '',
          own: true,
        }
        if (e.type === 'mail.send') sent.unshift(m)
        else drafts.unshift(m)
        if (e.draftKey) purged.add(e.draftKey)
        break
      }
    }
  }
  const all = [...INBOX, ...sent, ...drafts]
  const home = (m) => (m.key.startsWith('sent:') ? 'sent' : m.key.startsWith('draft:') ? 'drafts' : 'inbox')
  const folders = { inbox: [], drafts: [], sent: [], deleted: [], junk: [], outbox: [] }
  for (const m of all) {
    if (purged.has(m.key)) continue
    folders[deleted.has(m.key) ? 'deleted' : home(m)].push(m)
  }
  const isUnread = (m) => (m.unread && !read.has(m.key)) || unreadOverride.has(m.key)
  const s = { folders, isUnread, byKey: new Map(all.map((m) => [m.key, m])), deletedFrom: deleted }
  cache = { v, t, s }
  return s
}

export const findBySubject = (subject) => INBOX.find((m) => m.subject === subject) || null
// props.message: a subject (sidebar) or an index into the Inbox
export const messageFor = (x) => (typeof x === 'number' ? INBOX[x] : findBySubject(x)) || null
