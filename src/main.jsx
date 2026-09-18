import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import { loadAllData } from './lib/dataStore'
import './styles/index.css'

function Root() {
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    // Load ALL data from the database once at startup, before the app renders.
    // Every page will then read from the store (instant) instead of fetching.
    loadAllData()
      .then(() => setDataLoaded(true))
      .catch((err) => {
        // Even if the initial load fails, render the app so the user sees
        // an error toast — individual pages can still retry their own fetches.
        console.error('Initial data load failed:', err)
        setDataLoaded(true)
      })
  }, [])

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f7f8fa]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading application data...</p>
          <p className="text-gray-400 text-sm mt-1">This only happens once</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
