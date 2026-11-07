// my Documents: an explorer window on the fictional file system (src/apps/lib/fs.js).
import { makeExplorer } from '../lib/Explorer.jsx'
import { MY_DOCS } from '../lib/fs.js'

export default makeExplorer({ id: 'documents', title: 'my Documents', taskbar: 'my Documents', root: MY_DOCS, position: { x: 70, y: 36 } })
