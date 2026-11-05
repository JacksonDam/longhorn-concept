// Contains a crash to the part of the OS that threw (one window's content, one scene layer), so
// a bug in an app shows a Plex-style "stopped working" note in its window instead of unmounting
// the whole app. The error is logged to the console for tools/audit.mjs and debugging.
import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  // resetKey: when it changes (e.g. the event-log version), try rendering again
  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }
  componentDidCatch(error, info) {
    console.error(`[${this.props.name || 'component'}] ${error?.stack || error}`, info?.componentStack || '')
  }
  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback === null) return null
    return (
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f4f7fc', color: '#2a4f8f', font: "13px 'Plex', Tahoma, sans-serif", textAlign: 'center', padding: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{this.props.name || 'This program'} has stopped working</div>
          <div style={{ color: '#5a6f93' }}>Close the window and open it again.</div>
        </div>
      </div>
    )
  }
}
