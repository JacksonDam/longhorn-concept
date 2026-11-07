// The web as Internet Explorer finds it: the home pages the OS links to, as they were in 2003,
// taken from the Wayback Machine (snapshots nearest the PDC, 27 Oct 2003) and made static: no
// scripts, trackers or ad frames, their images and stylesheets copied to public/web/<site>/
// (sources: assets-src/SOURCES.md section "2003 web pages"; how to add one: docs/briefs/os.md).
// An address that matches none of them shows IE6's "The page cannot be displayed".
//
//   site: public/web/<site>/index.html; title: the page's <title>; addr: the address IE shows once
//   it has loaded (where the 2003 site sent the browser: Microsoft's IE home page, Ofoto's
//   Welcome.jsp, Hotmail's sign-in page); keys: the addresses that reach it (pageKey form)
export const PAGES = [
  // (MSN's own links go through its g.msn.com redirector: the ones the Wayback Machine kept)
  { site: 'msn', title: 'Welcome to MSN.com', addr: 'http://www.msn.com/', keys: ['msn.com', 'go.msn.com/0/0', 'g.msn.com/0US!s8.559_6217/98.a41/1??cm=Big7'] },
  { site: 'yahoo', title: 'Yahoo!', addr: 'http://www.yahoo.com/', keys: ['yahoo.com'] },
  { site: 'google', title: 'Google', addr: 'http://www.google.com/', keys: ['google.com'] },
  { site: 'microsoft', title: 'Microsoft Corporation', addr: 'http://www.microsoft.com/homepage/ms.htm', keys: ['microsoft.com', 'microsoft.com/homepage/ms.htm', 'microsoft.com/isapi/gomscom.asp?target=/'] },
  { site: 'ofoto', title: 'Ofoto The easiest way to share your photos and get high-quality prints', addr: 'http://www.ofoto.com/Welcome.jsp', keys: ['ofoto.com', 'ofoto.com/welcome.jsp', 'ofoto.com/index.html'] },
  { site: 'windowsmedia', title: 'Home - WindowsMedia.com Media Guide', addr: 'http://windowsmedia.com/Mediaguide/Home', keys: ['windowsmedia.com', 'windowsmedia.com/mediaguide/home'] },
  { site: 'hotmail', title: 'MSN Hotmail - More Useful Everyday', addr: 'http://lc1.law13.hotmail.passport.com/cgi-bin/login', keys: ['hotmail.com', 'hotmail.msn.com', 'lc1.law13.hotmail.passport.com/cgi-bin/login', 'g.msn.com/0US!s8.559_6217/98.a41/3??cm=Big7'] },
]

// an address's lookup key: host without "www." and a default port, lower case, then the path
// without a trailing slash and the query ("http://www.msn.com/" -> "msn.com")
export function pageKey(url) {
  const m = /^(?:[a-z]+:\/\/)?([^/?#]*)([^#]*)/i.exec(String(url || '').trim())
  if (!m) return ''
  const host = m[1].toLowerCase().replace(/:80$/, '').replace(/^www\./, '')
  const rest = m[2].replace(/\/+(?=\?|$)/, '')
  return host + rest.replace(/^[^?]*/, (p) => p.toLowerCase())
}

const BY_KEY = new Map(PAGES.flatMap((p) => p.keys.map((k) => [pageKey(k), p])))
// the archived page an address shows, or null; a link through a 2003 redirector that carries its
// target ("...?http://www.hotmail.com") counts as that target
export function pageFor(url) {
  const p = BY_KEY.get(pageKey(url))
  if (p) return p
  const inner = /[?&](?:[a-z]+=)?(https?:\/\/[^&]+)$/i.exec(String(url || ''))
  return inner ? BY_KEY.get(pageKey(decodeURIComponent(inner[1]))) || null : null
}
