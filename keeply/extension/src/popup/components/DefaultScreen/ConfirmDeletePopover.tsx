import type { KeeplyGroup } from '@/shared/types'

interface ConfirmDeletePopoverProps {
  readonly group: KeeplyGroup
  readonly confirmRef: React.RefObject<HTMLDivElement>
  readonly onCancel: () => void
  readonly onConfirm: (e: React.MouseEvent) => void
}

export function ConfirmDeletePopover({ group, confirmRef, onCancel, onConfirm }: ConfirmDeletePopoverProps) {
  return (
    <div className="confirm-delete" ref={confirmRef}>
      <div className="confirm-delete-text">
        Delete <strong>{group.emoji ? `${group.emoji} ` : ''}{group.name}</strong>?
      </div>
      <div className="confirm-delete-actions">
        <button className="confirm-delete-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="confirm-delete-btn" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </div>
  )
}
