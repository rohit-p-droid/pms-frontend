import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import {
  Heading1,
  Heading2,
  Heading3,
  Text,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Image as ImageIcon,
  PenTool,
  Box,
} from 'lucide-react'
import React from 'react'
import { CommandList } from './CommandList'

export const suggestion = {
  items: ({ query }: { query: string }) => {
    return [
      {
        title: 'Text',
        description: 'Just start typing with plain text.',
        icon: React.createElement(Text, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setParagraph().run()
        },
      },
      {
        title: 'Heading 1',
        description: 'Large section heading.',
        icon: React.createElement(Heading1, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        },
      },
      {
        title: 'Heading 2',
        description: 'Medium section heading.',
        icon: React.createElement(Heading2, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        },
      },
      {
        title: 'Heading 3',
        description: 'Small section heading.',
        icon: React.createElement(Heading3, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
        },
      },
      {
        title: 'Bullet List',
        description: 'Create a simple bulleted list.',
        icon: React.createElement(List, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: 'Numbered List',
        description: 'Create a list with numbering.',
        icon: React.createElement(ListOrdered, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        },
      },
      {
        title: 'Task List',
        description: 'Track tasks with checkboxes.',
        icon: React.createElement(CheckSquare, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run()
        },
      },
      {
        title: 'Quote',
        description: 'Capture a quotation.',
        icon: React.createElement(Quote, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        },
      },
      {
        title: 'Code Block',
        description: 'Code snippet with syntax highlighting.',
        icon: React.createElement(Code, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        },
      },
      {
        title: 'Diagram (Draw.io)',
        description: 'Insert a professional diagram.',
        icon: React.createElement(PenTool, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: 'drawio' }).run()
        },
      },
      {
        title: 'Mermaid Diagram',
        description: 'Code-based sequence, flow, or Gantt chart.',
        icon: React.createElement(Box, { size: 18 }),
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: 'mermaid' }).run()
        },
      },
      {
        title: 'Image',
        description: 'Upload an image from your computer.',
        icon: React.createElement(ImageIcon, { size: 18 }),
        command: ({ editor, range }: any) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = async () => {
            if (input.files?.length) {
              const file = input.files[0]
              editor.chain().focus().deleteRange(range).run()
              const event = new CustomEvent('editor-image-upload', { detail: { file, range } })
              window.dispatchEvent(event)
            }
          }
          input.click()
        },
      },
    ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10)
  },

  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
