import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'

import { ChatPage } from '@/components/chat/ChatPage'
import { AppShell } from '@/components/layout/AppShell'
import { SourcesPage } from '@/components/sources/SourcesPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/sources" element={<SourcesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
