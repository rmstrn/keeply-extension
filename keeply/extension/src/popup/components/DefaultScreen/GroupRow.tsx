import type { RefObject } from 'react'
import { TabFavicon } from '@/popup/components/TabRow/TabRow'
import { TabCountBadge } from '@/popup/components/TabCountBadge/TabCountBadge'
import type { GroupTab, KeeplyGroup } from '@/shared/types'
import { EmojiPicker } from './EmojiPicker'
import { ConfirmDeletePopover } from './ConfirmDeletePopover'
import { PencilIcon } from './Icons'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface GroupRowProps {
  readonly group: KeeplyGroup
  readonly isExpanded: boolean
  readonly isDragOver: boolean
  readonly isEditing: boolean
  readonly isMenuOpen: boolean
  readonly isConfirmingDelete: boolean
  readonly isEmojiPickerOpen: boolean
  readonly editName: string
  // Refs
  readonly editEmojiRef: RefObject<HTMLDivElement>
  readonly editInputRef: RefObject<HTMLInputElement>
  readonly menuRef: RefObject<HTMLDivElement>
  readonly confirmRef: RefObject<HTMLDivElement>
  // Callbacks
  readonly onToggleExpand: () => void
  readonly onDragOver: (e: React.DragEvent) => void
  readonly onDragLeave: (e: React.DragEvent) => void
  readonly onDrop: (e: React.DragEvent) => void
  readonly onStartEditing: () => void
  readonly onEditNameChange: (value: string) => void
  readonly onCommitRename: () => void
  readonly onCancelRename: () => void
  readonly onToggleEmojiPicker: () => void
  readonly onPickEmoji: (emoji: string) => void
  readonly onToggleMenu: () => void
  readonly onOpenAllClosed: (e: React.MouseEvent) => void
  readonly onCloseAllOpen: (e: React.MouseEvent) => void
  readonly onRequestDelete: () => void
  readonly onConfirmDelete: (e: React.MouseEvent) => void
  readonly onCancelDelete: () => void
  readonly onCloseTab: (e: React.MouseEvent, gt: GroupTab) => void
  readonly onTabClick: (gt: GroupTab) => void
  readonly onTabDragStart: (e: React.DragEvent, gt: GroupTab) => void
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function GroupRow({
  group, isExpanded, isDragOver, isEditing, isMenuOpen,
  isConfirmingDelete, isEmojiPickerOpen, editName,
  editEmojiRef, editInputRef, menuRef, confirmRef,
  onToggleExpand, onDragOver, onDragLeave, onDrop,
  onStartEditing, onEditNameChange, onCommitRename, onCancelRename,
  onToggleEmojiPicker, onPickEmoji,
  onToggleMenu, onOpenAllClosed, onCloseAllOpen,
  onRequestDelete, onConfirmDelete, onCancelDelete,
  onCloseTab, onTabClick, onTabDragStart,
}: GroupRowProps) {
  const closedCount = group.tabs.filter((t) => t.tabId === undefined).length
  const openCount = group.tabs.length - closedCount

  return (
    <div
      className={`group-item${isDragOver ? ' drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="rr group-header" onClick={() => { if (!isEditing) onToggleExpand() }}>
        {/* [emoji] — always visible, click opens emoji picker */}
        <div className="emoji-picker-wrapper" ref={isEmojiPickerOpen ? editEmojiRef : undefined}>
          <span
            className="group-emoji"
            role="button"
            aria-label="Change emoji"
            onClick={(e) => { e.stopPropagation(); onToggleEmojiPicker() }}
          >
            {group.emoji ?? '😀'}
          </span>
          {isEmojiPickerOpen && <EmojiPicker onPick={onPickEmoji} />}
        </div>

        {/* [name] — flex-grow, or inline rename input */}
        {isEditing ? (
          <input
            ref={editInputRef}
            className="group-rename-input"
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename()
              if (e.key === 'Escape') onCancelRename()
            }}
            onBlur={onCommitRename}
            onClick={(e) => e.stopPropagation()}
            maxLength={50}
            autoFocus
          />
        ) : (
          <span className="rn">{group.name}</span>
        )}

        {/* [badge] — always visible */}
        <TabCountBadge count={group.tabs.length} />

        {/* [pencil] — hover only, click → inline rename */}
        <button
          className="group-edit-btn"
          title="Rename group"
          onClick={(e) => { e.stopPropagation(); onStartEditing() }}
          aria-label="Rename group"
        >
          <PencilIcon />
        </button>

        {/* [⋯] — hover only, click → dropdown menu */}
        <div className="group-menu-wrapper" ref={isMenuOpen ? menuRef : undefined}>
          <button
            className="group-menu-btn"
            title="Group actions"
            aria-label="Group actions"
            onClick={(e) => { e.stopPropagation(); onToggleMenu() }}
          >
            ⋯
          </button>
          {isMenuOpen && (
            <div className="group-menu-dropdown">
              {closedCount > 0 && (
                <button
                  className="group-menu-item"
                  onClick={(e) => { onOpenAllClosed(e); onToggleMenu() }}
                >
                  Open all tabs
                </button>
              )}
              {openCount > 0 && (
                <button
                  className="group-menu-item"
                  onClick={(e) => { onCloseAllOpen(e); onToggleMenu() }}
                >
                  Close all tabs
                </button>
              )}
              <button
                className="group-menu-item group-menu-item--danger"
                onClick={(e) => { e.stopPropagation(); onRequestDelete() }}
              >
                Delete group
              </button>
            </div>
          )}
        </div>

        {/* [›] — always visible chevron */}
        <svg className={`expand-arrow${isExpanded ? ' expanded' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {isConfirmingDelete && (
        <ConfirmDeletePopover
          group={group}
          confirmRef={confirmRef}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}

      {isExpanded && (
        <div className="group-tabs-list">
          {group.tabs.map((gt) => {
            const isOpen = gt.tabId !== undefined
            return (
              <div
                key={gt.url}
                className={`tab-row group-tab-row${isOpen ? '' : ' tab-closed'}`}
                draggable={isOpen}
                onDragStart={isOpen ? (e) => {
                  e.stopPropagation()
                  onTabDragStart(e, gt)
                } : undefined}
                onClick={() => onTabClick(gt)}
              >
                <TabFavicon url={gt.favIconUrl} />
                <span className="tab-title">{gt.title}</span>
                <button
                  className="tab-close-btn"
                  title={isOpen ? 'Close tab' : 'Remove from group'}
                  onClick={(e) => onCloseTab(e, gt)}
                >
                  ×
                </button>
              </div>
            )
          })}
          {group.tabs.length === 0 && (
            <div className="tab-row empty"><span className="rm">No tabs in this group</span></div>
          )}
        </div>
      )}
    </div>
  )
}
