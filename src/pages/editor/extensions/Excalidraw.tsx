import React, { useCallback, useRef, useState, useEffect } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import type { NodeViewProps } from '@tiptap/core'

/**
 * We dynamically import Excalidraw because it's a huge library 
 * and requires browser APIs, so this avoids SSR issues (if next.js was used)
 * and speeds up initial editor load.
 */
import { Excalidraw, exportToSvg, getSceneVersion } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw'

const ExcalidrawComponent = (props: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [svgStr, setSvgStr] = useState<string>('')
  
  const elements = props.node.attrs.elements || []
  const appState = props.node.attrs.appState || {}
  const files = props.node.attrs.files || {}

  useEffect(() => {
    let isMounted = true
    const generateSvg = async () => {
      if (elements.length === 0) return
      try {
        const svg = await exportToSvg({
          elements,
          appState: {
            ...appState,
            exportBackground: true,
            exportWithDarkMode: false,
          },
          files,
        })
        svg.removeAttribute('width')
        svg.removeAttribute('height')
        svg.style.width = '100%'
        svg.style.maxWidth = '100%'
        svg.style.height = 'auto'
        svg.style.display = 'block'
        svg.style.margin = '0 auto'
        if (isMounted) setSvgStr(svg.outerHTML)
      } catch (err) {
        console.error("Failed to render preview excalidraw:", err)
      }
    }
    generateSvg()
    return () => { isMounted = false }
  }, [elements, appState, files])

  const onChange = useCallback(
    (newElements: readonly ExcalidrawElement[], newAppState: AppState, newFiles: BinaryFiles) => {
      // Excalidraw frequently fires onChange, so it's a good idea to conditionally update
      // But Tiptap relies on its update pipeline, we might debounce or just let it update on close.
    },
    []
  )

  const saveCanvas = (api: any) => {
    if (!api) return
    const currentElements = api.getSceneElements()
    const currentAppState = api.getAppState()
    const currentFiles = api.getFiles()
    
    props.updateAttributes({
      elements: currentElements,
      appState: {
        viewBackgroundColor: currentAppState.viewBackgroundColor,
        theme: currentAppState.theme,
      },
      files: currentFiles,
    })
    setIsEditing(false)
  }

  // Ref to hold the excalidraw api when editing
  const apiRef = useRef<any>(null)

  return (
    <NodeViewWrapper className="excalidraw-node my-4 w-full select-none cursor-default" data-drag-handle>
      {!isEditing ? (
        <div 
          className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[200px] flex items-center justify-center cursor-pointer group hover:border-[#007bff]"
          onClick={() => setIsEditing(true)}
        >
          {svgStr ? (
            <div dangerouslySetInnerHTML={{ __html: svgStr }} className="p-4 pointer-events-none w-full flex justify-center" />
          ) : (
            <div className="text-gray-400">Click to start drawing</div>
          )}
          <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Edit
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="relative w-full max-w-7xl h-full shadow-2xl rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white">
            <Excalidraw
              initialData={{ elements, appState: { ...appState, zoom: { value: 1 }, scrollX: 0, scrollY: 0 }, files }}
              onChange={onChange}
              excalidrawAPI={(api) => { apiRef.current = api }}
              theme="light" // Force light for canvas or use dark depending on preference
            />
            <div className="absolute bottom-4 right-4 z-[9999] flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => saveCanvas(apiRef.current)}
                className="bg-[#007bff] text-white px-4 py-2 rounded-md font-medium hover:bg-blue-600 shadow-lg"
              >
                Save Drawing
              </button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const ExcalidrawExtension = Node.create({
  name: 'excalidraw',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      elements: { default: [] },
      appState: { default: {} },
      files: { default: {} },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="excalidraw"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'excalidraw' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawComponent)
  },
})
