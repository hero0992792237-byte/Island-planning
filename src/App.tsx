import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import FloatingIsland from './components/FloatingIsland'
import TravelJournal from './components/TravelJournal'
import ErrorBoundary from './components/ErrorBoundary'
import { useGeolocation } from './hooks/useGeolocation'

function LocationLoader() {
  const { location: geoLocation } = useGeolocation()
  const { state, dispatch } = useApp()

  useEffect(() => {
    if (geoLocation.loaded) {
      // 保留用户手动设置的城市，不随 GPS 自动定位覆盖
      const existingManual = state.location.manualCity
      dispatch({
        type: 'SET_LOCATION',
        payload: existingManual ? { ...geoLocation, manualCity: existingManual } : geoLocation,
      })
    }
  }, [geoLocation, state.location.manualCity, dispatch])

  return null
}

function AppContent() {
  return (
    <div className="min-h-[100dvh] bg-[#f8f7f4]">
      <LocationLoader />
      <TravelJournal />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
        <FloatingIsland />
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
