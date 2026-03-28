import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'

export const CodeBlockComponent = ({ node: { attrs: { language: defaultLanguage } }, updateAttributes }: any) => {
  return (
    <NodeViewWrapper className="code-block relative group my-4 rounded-md overflow-hidden bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <select
          contentEditable={false}
          defaultValue={defaultLanguage || 'null'}
          onChange={event => {
            const val = event.target.value
            updateAttributes({ language: val === 'null' ? null : val })
          }}
          className="text-xs bg-white dark:bg-[#2d2d2d] text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3d3d3d] focus:ring-1 focus:ring-primary-500"
        >
          <option value="null">Auto / Plain Text</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="css">CSS</option>
          <option value="html">HTML</option>
          <option value="bash">Bash</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
          <option value="sql">SQL</option>
          <option value="java">Java</option>
        </select>
      </div>
      <pre className="!bg-transparent !m-0 !p-4 !overflow-x-auto text-[14px] leading-relaxed font-mono">
        <code>
          <NodeViewContent />
        </code>
      </pre>
    </NodeViewWrapper>
  )
}
