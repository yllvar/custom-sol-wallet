interface ConsoleLogProps {
  logs: string[]
}

export function ConsoleLog({ logs }: ConsoleLogProps) {
  return (
    <div className="mt-4 p-4 bg-black text-green-400 font-mono text-sm rounded-lg h-64 overflow-y-auto">
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
    </div>
  )
}

