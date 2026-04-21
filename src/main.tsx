import React from 'react'
import ReactDOM from 'react-dom/client'
import AppContent from './App.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { ContactProvider } from './context/ContactContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <ContactProvider>
        <AppContent />
      </ContactProvider>
    </UserProvider>
  </React.StrictMode>,
)
