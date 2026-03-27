import { BrowserRouter as Router, useRoutes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store/store'
import { routes } from './routes'
import { useTheme } from './hooks/useTheme'
import './index.css'

function AppContent() {
  // Initialize theme on mount
  useTheme()

  // Use the routes configuration
  const routeElements = useRoutes(routes)

  return routeElements
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <AppContent />
        </Router>
      </PersistGate>
    </Provider>
  )
}

export default App
