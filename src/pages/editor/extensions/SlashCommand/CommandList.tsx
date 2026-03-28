import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'

export interface CommandItem {
  title: string
  description: string
  icon: React.ReactNode
  command: (props: { editor: any; range: any }) => void
}

export const CommandList = forwardRef((props: { items: CommandItem[]; command: any }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  return (
    <div className="bg-white dark:bg-[#2c313a] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[280px] p-1 animate-in fade-in zoom-in duration-150">
      {props.items.length > 0 ? (
        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
          {props.items.map((item, index) => (
            <button
              key={index}
              onClick={() => selectItem(index)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded border ${
                index === selectedIndex 
                  ? 'bg-white border-primary-200 text-primary-600 dark:bg-gray-800 dark:border-primary-800' 
                  : 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800/50 dark:border-gray-700'
              }`}>
                {item.icon}
              </div>
              <div>
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
      )}
    </div>
  )
})

CommandList.displayName = 'CommandList'
