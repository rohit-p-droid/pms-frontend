import { useCallback, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { saveDocumentContent } from '../services/docs.service'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions {
  nodeId: string | null
  debounceMs?: number
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus
  triggerSave: (editor: Editor) => void
}

/**
 * useAutoSave — debounces TipTap editor onChange and sends content to the backend.
 *
 * Usage:
 *   const { saveStatus, triggerSave } = useAutoSave({ nodeId })
 *   editor.on('update', ({ editor }) => triggerSave(editor))
 */
export function useAutoSave({
  nodeId,
  debounceMs = 1500,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a stable reference to the latest save to prevent stale closures
  const latestNodeId = useRef(nodeId)
  latestNodeId.current = nodeId

  const triggerSave = useCallback(
    (editor: Editor) => {
      // Clear any pending debounce
      if (timerRef.current) clearTimeout(timerRef.current)

      setSaveStatus('saving')

      timerRef.current = setTimeout(async () => {
        const currentNodeId = latestNodeId.current
        if (!currentNodeId) {
          setSaveStatus('idle')
          return
        }

        try {
          const json = editor.getJSON() as Record<string, unknown>
          await saveDocumentContent(currentNodeId, json)
          setSaveStatus('saved')

          // Reset to idle after a moment so the UI doesn't stay "Saved" forever
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('error')
        }
      }, debounceMs)
    },
    [debounceMs]
  )

  return { saveStatus, triggerSave }
}
