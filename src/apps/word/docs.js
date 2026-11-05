// Document 12 and the fictional files in my Documents (short, neutral, late 2003).
import { makeDoc } from './rich.js'

const H = (text) => ({ text, b: true, size: 16, font: 'Arial', color: '#1f3f7a' })
const P = (text, x) => ({ text, ...x })
const B = (text) => ({ text, bullet: true })

export const DOCS = {
  'Document 12': [H('Weekend list'), P(''), B('Pick up the photos from the store'), B('Call Kathy about Saturday'), B('Return the library books'), B('Buy bulbs for the garden'), P(''), P('The potluck starts at six. Bring the salad bowl back to Harold.')],
  'Book club list.doc': [H('Book Club 2003'), P('We meet on the second Monday of each month at 7:00 PM.'), P(''), B('November: a short mystery'), B('December: holiday party, no book'), B('January: a travel memoir'), P(''), P('Members: Harold, Kathy, Anthony, Sondra', { i: true })],
  'Garden plan.doc': [H('Garden plan'), P('Spring beds along the fence: tulips, then lavender in the corner by the gate.'), P(''), B('Plant bulbs before the first frost'), B('Move the rosemary to a sunny spot'), B('New hose for the back yard')],
  'Holiday cards.doc': [H('Holiday cards'), P('Send by December 10.'), P(''), B('Kathy and family'), B('Hank'), B('Justin and Lee'), B('The Beckers'), B('Aunt Ruth')],
  'Moving checklist.doc': [H('Moving checklist'), B('Forward the mail'), B('Book the van for the 23rd'), B('Pack the kitchen last'), B('Return the keys'), P(''), P('Done by the end of August!', { b: true })],
  'Recipes.txt': [
    P('Tomato soup', { font: 'Courier New', size: 11 }),
    P('- 6 ripe tomatoes, 1 onion, 2 cloves garlic', { font: 'Courier New', size: 11 }),
    P('- simmer 20 minutes, blend, season', { font: 'Courier New', size: 11 }),
    P('', { font: 'Courier New', size: 11 }),
    P('Banana bread', { font: 'Courier New', size: 11 }),
    P('- 3 bananas, 2 cups flour, 1 cup sugar, 1 egg', { font: 'Courier New', size: 11 }),
    P('- bake at 350 F for an hour', { font: 'Courier New', size: 11 }),
  ],
  'Weekend trip.doc': [H('Weekend trip'), P('Leave Friday after work, back Sunday evening.'), P(''), B('Rain jackets'), B('Camera and the spare batteries'), B('Trail map'), B('Snacks for the drive')],
}

const cache = new Map()
export function docFor(name) {
  const k = DOCS[name] ? name : 'Document 12'
  if (!cache.has(k)) cache.set(k, makeDoc(DOCS[k]))
  return cache.get(k)
}
