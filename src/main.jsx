// (?report: a test harness's sink, first so its error listeners are up before the app runs)
import './core/report.js'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// the system sounds: a listener on the event log (real use only)
import './os/sounds.js'

createRoot(document.getElementById('root')).render(<App />)
