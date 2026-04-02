import { EMOJI_CATEGORIES } from '@/shared/constants'

interface EmojiPickerProps {
  readonly onPick: (emoji: string) => void
}

export function EmojiPicker({ onPick }: EmojiPickerProps) {
  return (
    <div className="emoji-dropdown">
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.label} className="emoji-cat">
          <div className="emoji-cat-label">{cat.label}</div>
          <div className="emoji-grid">
            {cat.emojis.map((e) => (
              <button
                key={e}
                type="button"
                className="emoji-cell"
                onClick={(ev) => { ev.stopPropagation(); onPick(e) }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
