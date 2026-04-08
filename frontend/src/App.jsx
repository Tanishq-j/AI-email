import './index.css'

function App() {
  return (
    <div className="flex h-screen w-full bg-white text-gray-900 font-sans">
      {/* Sidebar - fixed width 240px, solid background, simple border-right */}
      <aside className="w-[240px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-base font-medium">Smart Email Assistant</h1>
        </div>
        <nav className="p-4 flex flex-col gap-1">
          <a href="#" className="px-3 py-1.5 text-sm rounded bg-gray-200 font-medium">
            Inbox
          </a>
          <a href="#" className="px-3 py-1.5 text-sm rounded hover:bg-gray-100">
            Priority Projects
          </a>
          <a href="#" className="px-3 py-1.5 text-sm rounded hover:bg-gray-100">
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header - solid background, simple text */}
        <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6">
          <h2 className="text-lg font-medium">Inbox</h2>
        </header>

        {/* Content Section - standard padding, normal containers */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl">
            <h3 className="text-xl font-medium mb-4">Priority Communications</h3>
            <div className="border border-gray-200 rounded divide-y divide-gray-200">
              <div className="p-4 flex flex-col gap-1">
                <span className="text-sm font-medium">CEO Office</span>
                <span className="text-sm text-gray-500">Urgent: Q3 Roadmap Update required by EOD</span>
              </div>
              <div className="p-4 flex flex-col gap-1">
                <span className="text-sm font-medium">Project Alpha Team</span>
                <span className="text-sm text-gray-500">Status report on cloud migration</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
