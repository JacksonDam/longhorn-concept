// my Computer: drives and special folders; double-click opens folders in place, files in their app.
import { makeExplorer } from '../lib/Explorer.jsx'

export default makeExplorer({ id: 'computer', title: 'my Computer', taskbar: 'My Computer', root: ['my Computer'], position: { x: 100, y: 60 } })
