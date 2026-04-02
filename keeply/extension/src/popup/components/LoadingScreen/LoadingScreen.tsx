import { LOADING_TAGS } from '@/shared/constants'

export function LoadingScreen() {
  return (
    <div className="lb" role="status" aria-label="Grouping tabs with AI">
      <div className="spin-wrap" aria-hidden="true">
        <div className="spin" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p className="lt">Grouping your tabs…</p>
        <p className="ls" style={{ marginTop: 5 }}>
          AI is analyzing your tabs
        </p>
      </div>
      <div className="tags" aria-hidden="true">
        {LOADING_TAGS.map((tag) => (
          <span
            key={tag.label}
            className="tag"
            style={{ background: tag.bg, color: tag.color }}
          >
            {tag.label}
          </span>
        ))}
      </div>
      <div className="prog-wrap">
        <div className="prog-row">
          <span className="prog-lbl">Analyzing patterns…</span>
        </div>
        <div className="prog-track" role="progressbar" aria-label="AI processing">
          <div className="prog-fill" />
        </div>
      </div>
      <p className="ls">Usually done in 2–3 seconds</p>
    </div>
  )
}
