import { useCallback, useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import type { NodeViewProps, RawCommands } from '@tiptap/core'
import { Edit2, X } from 'lucide-react'

const DRAWIO_URL =
  'https://embed.diagrams.net/?embed=1&ui=kennedy&spin=1&modified=unsavedChanges&proto=json&saveAndExit=1&dark=0'

interface DrawIOSavePayload {
  xml: string
  svg: string
}

interface DrawIOMessage {
  event?: string
  data?: unknown
  xml?: string
}

type ExportPhase = 'idle' | 'exporting'

function parseDrawIOMessage(raw: unknown): DrawIOMessage | null {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? (parsed as DrawIOMessage) : null
    } catch {
      return null
    }
  }

  if (typeof raw === 'object' && raw !== null) {
    return raw as DrawIOMessage
  }

  return null
}

function extractXmlFromMessage(message: DrawIOMessage): string | null {
  if (typeof message.xml === 'string' && message.xml.trim().length > 0) {
    return message.xml
  }

  if (typeof message.data === 'string') {
    const trimmed = message.data.trim()
    if (trimmed.startsWith('<')) {
      return trimmed
    }
  }

  if (typeof message.data === 'object' && message.data !== null) {
    const maybeXml = (message.data as { xml?: unknown }).xml
    if (typeof maybeXml === 'string' && maybeXml.trim().length > 0) {
      return maybeXml
    }
  }

  return null
}

function extractStringData(value: unknown): string | null {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null) {
    const maybeData = (value as { data?: unknown }).data
    if (typeof maybeData === 'string') {
      return maybeData
    }
  }

  return null
}

function decodeBase64Utf8(base64: string) {
  try {
    const binString = atob(base64)
    const bytes = new Uint8Array(binString.length)
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return atob(base64)
  }
}

function isGrayscale(colorStr: string): boolean {
  if (!colorStr) return false;
  const c = colorStr.toLowerCase().trim();
  if (c === 'none' || c === 'transparent') return false;
  if (c === 'black' || c === 'white' || c === 'gray' || c === 'grey') return true;
  if (c.startsWith('#')) {
    if (c.length === 4) return c[1] === c[2] && c[2] === c[3];
    if (c.length === 7) return c.substring(1,3) === c.substring(3,5) && c.substring(3,5) === c.substring(5,7);
    return false;
  }
  if (c.startsWith('rgb')) {
    const coords = c.match(/\d+/g);
    if (coords && coords.length >= 3) {
      const r = parseInt(coords[0], 10);
      const g = parseInt(coords[1], 10);
      const b = parseInt(coords[2], 10);
      return Math.abs(r - g) <= 10 && Math.abs(g - b) <= 10 && Math.abs(r - b) <= 10;
    }
  }
  return false;
}

function sanitizeSvg(svg: string): string {
  let next = svg;

  if (next.startsWith('data:image/svg+xml;base64,')) {
    next = decodeBase64Utf8(next.split(',')[1]);
  } else if (next.startsWith('data:image/svg+xml,')) {
    next = decodeURIComponent(next.substring(next.indexOf(',') + 1));
  }

  // Remove explicit background style so exported preview can stay transparent
  next = next.replace(/background-color\s*:\s*[^;"]+;?/gi, '');
  // Remove canvas solid background
  next = next.replace(
    /<rect[^>]*width="100%"[^>]*height="100%"[^>]*\/?>/gi,
    ''
  );

  // Map Strokes
  next = next.replace(/stroke\s*=\s*(["'])([^"']+)\1/gi, (match, quote, color) => {
    if (isGrayscale(color)) return `stroke=${quote}currentColor${quote}`;
    return match;
  });

  // Map Fills
  next = next.replace(/fill\s*=\s*(["'])([^"']+)\1/gi, (match, quote, color) => {
    if (isGrayscale(color)) return `fill=${quote}var(--drawio-bg)${quote}`;
    return match;
  });

  // Map inline CSS styles
  next = next.replace(/(?:color|stroke|fill)\s*:\s*([^;"]+)(?=[;"])/gi, (match, color) => {
    const property = match.toLowerCase().split(':')[0].trim();
    if (isGrayscale(color)) {
      if (property === 'fill') return `fill: var(--drawio-bg)`;
      if (property === 'stroke') return `stroke: currentColor`;
      if (property === 'color') return `color: currentColor`;
    }
    return match;
  });

  // Text/tspan elements shouldn't have var(--drawio-bg) fill, they should match text color
  next = next.replace(/(<(?:text|tspan)[^>]*?)fill="var\(--drawio-bg\)"/gi, '$1fill="currentColor"');
  
  if (!next.includes('preserveAspectRatio=')) {
    next = next.replace(/<svg\s/i, '<svg preserveAspectRatio="xMidYMid meet" ');
  }

  next = next.replace(/(<svg[^>]*?)\s+width="[^"]*"/gi, '$1');
  next = next.replace(/(<svg[^>]*?)\s+height="[^"]*"/gi, '$1');
  next = next.replace(/<svg\s/i, '<svg width="100%" height="100%" ');

  return next;
}

const DrawIOComponent = (props: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const canEdit = props.editor.isEditable
  const xmlData = props.node.attrs.xml || ''
  const svgData = props.node.attrs.svg || ''
  const width = Number(props.node.attrs.width) || 600
  const height = Number(props.node.attrs.height) || 400

  const previewHtml = svgData ? sanitizeSvg(svgData) : '';

  const openDrawIO = useCallback(() => {
    if (!canEdit) {
      return
    }
    setIsEditing(true)
  }, [canEdit])

  const closeDrawIO = useCallback(
    (payload?: DrawIOSavePayload) => {
      // payload might be undefined if user just cancels/closes without saving
      if (payload && payload.xml) {
        props.updateAttributes({
          xml: payload.xml,
          svg: payload.svg || '',
        })
      }
      setIsEditing(false)
    },
    [props]
  )

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!canEdit) {
        return
      }

      const startX = event.clientX
      const startY = event.clientY
      const startWidth = width
      const startHeight = height

      const onMove = (moveEvent: MouseEvent) => {
        const nextWidth = Math.max(100, startWidth + (moveEvent.clientX - startX))
        const nextHeight = Math.max(100, startHeight + (moveEvent.clientY - startY))
        props.updateAttributes({ width: Math.round(nextWidth), height: Math.round(nextHeight) })
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [canEdit, props, width, height]
  )

  return (
    <NodeViewWrapper className="draw-io-wrapper my-4 flex justify-center w-full select-none" data-drag-handle>
      <style>{`
        .draw-io-wrapper { --drawio-bg: #ffffff; }
        html.dark .draw-io-wrapper { --drawio-bg: #1f2937; }
        .diagram-wrapper svg { width: 100%; height: 100%; pointer-events: none; }
      `}</style>
      <div
        className={`relative group rounded-lg border bg-white dark:bg-gray-800 overflow-hidden ${props.selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {svgData ? (
          <>
            <div 
              className="w-full h-full diagram-wrapper cursor-pointer flex items-center justify-center p-2" 
              onClick={openDrawIO}
              dangerouslySetInnerHTML={{ __html: previewHtml }} 
            />
            {canEdit && (
              <button
                type="button"
                onMouseDown={startResize}
                className="absolute bottom-1 right-1 h-4 w-4 rounded-sm border border-gray-300 bg-white/90 hover:bg-white cursor-se-resize shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Resize diagram"
                aria-label="Resize diagram"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6 text-center cursor-pointer" onClick={openDrawIO}>
            {xmlData ? (
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Diagram saved</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {canEdit ? 'Click to open and re-render preview' : 'Read-only mode'}
                </p>
              </div>
            ) : canEdit ? (
              <button className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors">
                Create Draw.io Diagram
              </button>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Read-only mode. Switch to Edit to modify.</p>
            )}
          </div>
        )}

        {xmlData && canEdit && (
          <button
            onClick={openDrawIO}
            className="absolute top-3 right-3 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Edit diagram"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>

      {isEditing && (
        <DrawIOEditor initialXml={xmlData} onSave={closeDrawIO} onCancel={() => setIsEditing(false)} />
      )}
    </NodeViewWrapper>
  )
}

interface DrawIOEditorProps {
  initialXml: string
  onSave: (payload: DrawIOSavePayload) => void
  onCancel: () => void
}

function DrawIOEditor({ initialXml, onSave, onCancel }: DrawIOEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const exportPhaseRef = useRef<ExportPhase>('idle')
  const latestXmlRef = useRef(initialXml)
  const drawIoOriginRef = useRef<string>('https://embed.diagrams.net')

  const postToDrawIO = useCallback((payload: Record<string, unknown>) => {
    if (!iframeRef.current?.contentWindow) {
      return
    }

    iframeRef.current.contentWindow.postMessage(JSON.stringify(payload), drawIoOriginRef.current || '*')
  }, [])

  const requestExport = useCallback(() => {
    exportPhaseRef.current = 'exporting'
    postToDrawIO({ action: 'export', format: 'svg', xml: true, bg: 'none', spin: 'Saving diagram...' })
  }, [postToDrawIO])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return
      }

      if (!event.origin.includes('diagrams.net')) {
        return
      }

      drawIoOriginRef.current = event.origin

      const data = parseDrawIOMessage(event.data)
      if (!data?.event) {
        return
      }

      if (data.event === 'init') {
        setIsReady(true)
        return
      }

      if (data.event === 'exit') {
        if (exportPhaseRef.current === 'idle') {
          onCancel()
        }
        return
      }

      if (data.event === 'save') {
        const xml = extractXmlFromMessage(data)
        if (xml) {
          latestXmlRef.current = xml
        }
        if (!isSaving) {
          setIsSaving(true)
        }
        requestExport()
        return
      }

      if (data.event === 'export') {
        const exportedSvg = extractStringData(data.data)
        const xml = extractXmlFromMessage(data) || latestXmlRef.current
        
        if (xml) {
            latestXmlRef.current = xml
        }

        if (!exportedSvg) {
          return
        }

        if (exportPhaseRef.current === 'exporting') {
          onSave({
            xml: latestXmlRef.current,
            svg: exportedSvg,
          })
          exportPhaseRef.current = 'idle'
          setIsSaving(false)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isSaving, onCancel, onSave, requestExport])

  useEffect(() => {
    if (!isReady || !iframeRef.current?.contentWindow) {
      return
    }

    postToDrawIO({
      action: 'load',
      autosave: 1,
      xml: initialXml || undefined,
    })
  }, [initialXml, isReady, postToDrawIO])

  const handleSave = () => {
    if (!iframeRef.current?.contentWindow || isSaving) {
      return
    }

    setIsSaving(true)
    if (latestXmlRef.current) {
      // Keep last known xml around even if export events arrive in unexpected order.
      postToDrawIO({ action: 'load', xml: latestXmlRef.current })
    }
    requestExport()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full h-full flex flex-col max-w-7xl max-h-[92vh]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Draw.io Diagram</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={DRAWIO_URL}
            className="w-full h-full border-0"
            title="Draw.io Diagram Editor"
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3 shrink-0 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSaving ? 'Saving...' : 'Save and Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const DrawIOExtension = Node.create({
  name: 'drawio',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      xml: { default: '' },
      svg: { default: '' },
      width: { default: 600 },
      height: { default: 400 },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="drawio"]',
        getAttrs: (el) => ({
          xml: (el as HTMLElement).getAttribute('data-xml') || '',
          svg: (el as HTMLElement).getAttribute('data-svg') || '',
          width: Number((el as HTMLElement).getAttribute('data-width')) || 600,
          height: Number((el as HTMLElement).getAttribute('data-height')) || 400,
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'drawio',
        'data-xml': HTMLAttributes.xml,
        'data-svg': HTMLAttributes.svg,
        'data-width': HTMLAttributes.width,
        'data-height': HTMLAttributes.height,
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawIOComponent)
  },

  addCommands() {
    return {
      insertDrawIO:
        () =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { xml: '', svg: '', width: 600, height: 400 },
          })
        },
    } as Partial<RawCommands>
  },
})
