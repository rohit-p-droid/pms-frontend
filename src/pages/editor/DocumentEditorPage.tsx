import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { createLowlight } from 'lowlight'
import {
  Bold, Italic, Strikethrough, Code as CodeIcon,
  List as ListIcon, ListOrdered, CheckSquare, Quote, TerminalSquare,
  Heading1, Table as TableIcon, Activity, Columns, Rows, Trash,
  Minus, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react'
import { DrawIOExtension } from './extensions/DrawIO'
import { config } from '../../config'
import axios from 'axios'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import sql from 'highlight.js/lib/languages/sql'
import java from 'highlight.js/lib/languages/java'
import TextAlign from '@tiptap/extension-text-align'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { LineHeight } from './extensions/LineHeight'
import { CodeBlockComponent } from './extensions/CodeBlockComponent'
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
lowlight.register('markdown', markdown)
lowlight.register('sql', sql)
lowlight.register('java', java)

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
  label?: string
  icon?: React.ReactNode
  title?: string
}

function ToolbarBtn({ onClick, active, label, icon, title }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault() // prevent editor blur
        onClick()
      }}
      title={title ?? label}
      className={`p-1.5 flex items-center justify-center text-sm font-medium rounded-md transition-all ${
        active
          ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200 shadow-sm'
          : 'text-secondary-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {icon ? icon : label}
    </button>
  )
}

// ── Image Upload Helper ───────────────────────────────────────────────────────
const uploadImage = async (file: File, token: string | null) => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await axios.post(`${config.API_URL}/upload`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data?.data?.url
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
      CodeBlockLowlight.configure({ lowlight }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent)
        },
      }),
      LineHeight.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ 
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Image.configure({ inline: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      DrawIOExtension,
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-300px)] px-4 sm:px-8',
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) continue

            // Dispatch a custom event reusing the same upload flow
            const uploadEvent = new CustomEvent('editor-image-upload', { detail: { file } })
            window.dispatchEvent(uploadEvent)
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      triggerSave(editor)
    },
  })

  const token = useSelector((state: RootState) => state.auth.token)

  // Global custom event listener for image uploads from SlashCommand
  useEffect(() => {
    const handleImageUpload = async (e: any) => {
      if (!editor || !e.detail?.file) return
      try {
        const url = await uploadImage(e.detail.file, token)
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      } catch (err) {
        console.error("Image upload failed", err)
      }
    }

    window.addEventListener('editor-image-upload', handleImageUpload)
    return () => window.removeEventListener('editor-image-upload', handleImageUpload)
  }, [editor, token])

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
            <select
              title="Text Content Type"
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#2c313a] text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer min-w-[120px]"
              value={
                editor?.isActive('heading', { level: 1 }) ? 'h1' :
                editor?.isActive('heading', { level: 2 }) ? 'h2' :
                editor?.isActive('heading', { level: 3 }) ? 'h3' : 'p'
              }
              onChange={(e) => {
                const val = e.target.value
                if (val === 'p') editor?.chain().focus().setParagraph().run()
                else if (val === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run()
                else if (val === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run()
                else if (val === 'h3') editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }}
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Inline marks */}
            <ToolbarBtn
              icon={<Bold size={18} />}
              title="Bold"
              active={editor?.isActive('bold') ?? false}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarBtn
              icon={<Italic size={18} />}
              title="Italic"
              active={editor?.isActive('italic') ?? false}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarBtn
              icon={<Strikethrough size={18} />}
              title="Strikethrough"
              active={editor?.isActive('strike') ?? false}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
            <ToolbarBtn
              icon={<CodeIcon size={18} />}
              title="Inline code"
              active={editor?.isActive('code') ?? false}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            />

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Lists */}
            <ToolbarBtn
              icon={<ListIcon size={18} />}
              title="Bullet list"
              active={editor?.isActive('bulletList') ?? false}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarBtn
              icon={<ListOrdered size={18} />}
              title="Ordered list"
              active={editor?.isActive('orderedList') ?? false}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarBtn
              icon={<CheckSquare size={18} />}
              title="Task list"
              active={editor?.isActive('taskList') ?? false}
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
            />

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Text Alignment */}
            <ToolbarBtn
              icon={<AlignLeft size={18} />}
              title="Align left"
              active={editor?.isActive({ textAlign: 'left' }) ?? false}
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            />
            <ToolbarBtn
              icon={<AlignCenter size={18} />}
              title="Align center"
              active={editor?.isActive({ textAlign: 'center' }) ?? false}
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            />
            <ToolbarBtn
              icon={<AlignRight size={18} />}
              title="Align right"
              active={editor?.isActive({ textAlign: 'right' }) ?? false}
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            />
            <ToolbarBtn
              icon={<AlignJustify size={18} />}
              title="Justify"
              active={editor?.isActive({ textAlign: 'justify' }) ?? false}
              onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
            />

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Block types */}
            <ToolbarBtn
              icon={<TerminalSquare size={18} />}
              title="Code block"
              active={editor?.isActive('codeBlock') ?? false}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
            <ToolbarBtn
              icon={<Quote size={18} />}
              title="Blockquote"
              active={editor?.isActive('blockquote') ?? false}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarBtn
              icon={<Minus size={18} />}
              title="Horizontal rule"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            />

            <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Table */}
            <ToolbarBtn
              icon={<TableIcon size={18} />}
              title="Insert table"
              active={editor?.isActive('table') ?? false}
              onClick={() =>
                editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            />

             <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

             {/* Diagrams */}
            <ToolbarBtn
              icon={<ImageIcon size={18} />}
              title="Upload Image"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = async () => {
                  if (input.files?.length) {
                    const event = new CustomEvent('editor-image-upload', { detail: { file: input.files[0] } })
                    window.dispatchEvent(event)
                  }
                }
                input.click()
              }}
            />
            <ToolbarBtn
              icon={<Activity size={18} />}
              title="Draw Diagram (Draw.io)"
              onClick={() => editor?.chain().focus().insertContent({ type: 'drawio' }).run() }
            />
          </div>
        )}

        {/* ── Editor Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {loading || !editor ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : (
            <>
              {editor && isEditing && (
                <BubbleMenu 
                  editor={editor} 
                  // @ts-ignore - tippyOptions is valid but Tiptap types might be out of sync
                  tippyOptions={{ zIndex: 99999, placement: 'top' }}
                  shouldShow={({ state, editor }) => {
                    // Show menu if text is selected, or if we're inside a table
                    return !state.selection.empty || editor.isActive('table')
                  }}
                  className="flex items-center gap-1 bg-white dark:bg-[#343a40] shadow-lg border border-gray-200 dark:border-gray-700 rounded-md p-1"
                >
                  <ToolbarBtn icon={<Bold size={16} />} title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
                  <ToolbarBtn icon={<Italic size={16} />} title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
                  <ToolbarBtn icon={<Strikethrough size={16} />} title="Strike" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
                  <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <ToolbarBtn icon={<CodeIcon size={16} />} title="Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} />
                  {editor.isActive('table') && (
                    <>
                      <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                      <ToolbarBtn icon={<Columns size={16} />} title="Add Column After" onClick={() => editor.chain().focus().addColumnAfter().run()} />
                      <ToolbarBtn icon={<Rows size={16} />} title="Add Row After" onClick={() => editor.chain().focus().addRowAfter().run()} />
                      <ToolbarBtn icon={<div className="flex items-center gap-1 text-red-500"><Trash size={16} /><span className="text-[11px] font-semibold uppercase">Col</span></div>} title="Delete Column" onClick={() => editor.chain().focus().deleteColumn().run()} />
                      <ToolbarBtn icon={<div className="flex items-center gap-1 text-red-500"><Trash size={16} /><span className="text-[11px] font-semibold uppercase">Row</span></div>} title="Delete Row" onClick={() => editor.chain().focus().deleteRow().run()} />
                    </>
                  )}
                </BubbleMenu>
              )}
              {editor && isEditing && (
                <FloatingMenu editor={editor} className="flex gap-1">
                  <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-600">
                    <Heading1 size={14} />
                  </button>
                  <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-600">
                    <ListIcon size={14} />
                  </button>
                </FloatingMenu>
              )}
              <EditorContent editor={editor} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
