interface Props {
  title: string
}

export default function ComingSoonPage({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-500 dark:text-gray-400">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">{title}</h1>
        <p className="text-lg">This feature is coming soon.</p>
        <p className="text-sm">We are working hard to build it out in the future!</p>
      </div>
    </div>
  )
}
