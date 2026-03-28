import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import type { RootState } from '../../store/store'
import { getDocumentContent } from '../../services/docs.service'
import { useAutoSave } from '../../hooks/useAutoSave'

// ── Lowlight setup ────────────────────────────────────────────────────────────
const lowlight = createLowlight()
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('css', css)
lowlight.register('html', xml)
lowlight.register('bash', bash)
lowlight.register('json', json)

// ── Save status badge ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  idle: '',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed',
}

// ── Toolbar Button ────────────────────────────────────────────────────────────
interface ToolbarBtnProps {
  onClick: () => void
  active?: boolean
  label: string
  title?: string
}

function ToolbarBtn({ onClick, active, label, title }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault() // prevent editor blur
        onClick()
      }}
      title={title ?? label}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
        active
          ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200 shadow-sm'
          : 'text-secondary-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

// ── Editor Page ───────────────────────────────────────────────────────────────

export default function DocumentEditorPage() {
  const { openNodeId, openNodeName } = useSelector((state: RootState) => state.docs)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { saveStatus, triggerSave } = useAutoSave({ nodeId: openNodeId })

  // Reset to view mode when switching documents
  useEffect(() => {
    setIsEditing(false)
  }, [openNodeId])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default codeBlock in favor of lowlight version
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-300px)]',
      },
    },
    onUpdate: ({ editor }) => {
      triggerSave(editor)
    },
  })

  // Sync editable state
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(isEditing)
    }
  }, [isEditing, editor])

  // Load content when node changes
  useEffect(() => {
    if (!openNodeId || !editor) return

    setLoading(true)
    getDocumentContent(openNodeId)
      .then((doc) => {
        if (doc?.content) {
          editor.commands.setContent(doc.content as any)
        } else {
          editor.commands.clearContent()
        }
      })
      .catch(() => editor.commands.clearContent())
      .finally(() => setLoading(false))
  }, [openNodeId, editor])

  // ── No document selected ──────────────────────────────────────────────────
  if (!openNodeId) {
    return (
      <div className="p-4 sm:p-6 w-full max-w-[1400px] mx-auto h-full flex flex-col">
        <div className="bg-white dark:bg-[#343a40] rounded shadow border-t-[3px] border-t-[#007bff] flex flex-col flex-1 items-center justify-center min-h-0">
          <p className="text-gray-500 dark:text-gray-400">Select a document from the sidebar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1400px] mx-auto h-full flex flex-col">
      <div className="bg-white dark:bg-[#343a40] rounded shadow border-t-[3px] border-t-[#007bff] flex flex-col flex-1 min-h-0">
        
        {/* ── Document Title Header ───────────────────────────────────────────── */}
        {openNodeName && (
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-[#4b545c] shrink-0 min-h-[56px] flex-wrap gap-2">
            <h1 className="text-xl font-medium text-gray-800 dark:text-gray-200 tracking-tight m-0">
              {openNodeName}
            </h1>
            <div className="flex items-center gap-4">
              {saveStatus !== 'idle' && (
                <span
                  className={`text-sm font-medium ${
                    saveStatus === 'saved'
                      ? 'text-[#28a745]'
                      : saveStatus === 'error'
                      ? 'text-[#dc3545]'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {STATUS_LABELS[saveStatus]}
                </span>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`text-sm px-4 py-1.5 font-medium rounded transition-all shadow-sm ${
                  isEditing
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 border border-transparent'
                    : 'bg-[#007bff] text-white hover:bg-[#0056b3] border border-[#007bff]'
                }`}
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>
        )}

        {/* ── Editor Toolbar ──────────────────────────────────────────────────── */}
        {isEditing && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-200 dark:border-[#4b545c] bg-gray-50 dark:bg-[#3a4047] flex-wrap shrink-0">
            {/* Heading controls */}
            {([1, 2, 3] as const).map((level) => (
              <ToolbarBtn
                key={level}
                label={`H${level}`}
                title={`Heading ${level}`}
                active={editor?.isActive('heading', { level }) ?? false}
                onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
              />
            ))}

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Inline marks */}
            <ToolbarBtn
              label="B"
              title="Bold"
              active={editor?.isActive('bold') ?? false}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarBtn
              label="I"
              title="Italic"
              active={editor?.isActive('italic') ?? false}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarBtn
              label="S"
              title="Strikethrough"
              active={editor?.isActive('strike') ?? false}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
            <ToolbarBtn
              label="`"
              title="Inline code"
              active={editor?.isActive('code') ?? false}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            />

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Lists */}
            <ToolbarBtn
              label="UL"
              title="Bullet list"
              active={editor?.isActive('bulletList') ?? false}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarBtn
              label="OL"
              title="Ordered list"
              active={editor?.isActive('orderedList') ?? false}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Block types */}
            <ToolbarBtn
              label="Code"
              title="Code block"
              active={editor?.isActive('codeBlock') ?? false}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
            <ToolbarBtn
              label="Quote"
              title="Blockquote"
              active={editor?.isActive('blockquote') ?? false}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarBtn
              label="—"
              title="Horizontal rule"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            />

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Table */}
            <ToolbarBtn
              label="Table"
              title="Insert table"
              active={editor?.isActive('table') ?? false}
              onClick={() =>
                editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            />
          </div>
        )}

        {/* ── Editor Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
    </div>
  )
}
