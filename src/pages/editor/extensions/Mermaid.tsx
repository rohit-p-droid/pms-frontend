import React, { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import type { NodeViewProps } from '@tiptap/core'
import mermaid from 'mermaid'

// Configure mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' })

const MermaidComponent = (props: NodeViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  
  const code = props.node.attrs.code || 'graph TD\n  A-->B;'
  const isEditing = props.editor.isEditable && props.selected

  useEffect(() => {
    let isMounted = true
    const renderDiagram = async () => {
      if (!code) return
      try {
        setError(null)
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, code)
        if (isMounted) {
          setSvgContent(svg)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Syntax error in Mermaid diagram')
        }
      }
    }
    
    renderDiagram()
    
    return () => {
      isMounted = false
    }
  }, [code])

  const updateCodeDOM = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    props.updateAttributes({ code: e.target.value })
  }

  return (
    <NodeViewWrapper className="mermaid-node my-4 outline outline-2 outline-transparent transition-all data-[selected=true]:outline-primary-500 rounded-md p-2">
      <div 
        className="flex justify-center items-center bg-gray-50 dark:bg-gray-800/50 rounded p-4 min-h-[100px]"
        ref={containerRef}
      >
        {error ? (
          <div className="text-red-500 text-sm font-mono whitespace-pre-wrap">{error}</div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        )}
      </div>
      
      {isEditing && (
        <div className="mt-2 text-sm">
           <textarea
              className="w-full h-32 p-2 font-mono text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-200 border-none rounded focus:ring-2 focus:ring-primary-500"
              value={code}
              onChange={updateCodeDOM}
              spellCheck="false"
              placeholder="Enter mermaid code here..."
            />
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const MermaidExtension = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n  A-->B;',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent)
  },
})
