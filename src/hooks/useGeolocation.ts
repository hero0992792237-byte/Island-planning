import { useState, useEffect, useCallback } from 'react'
import type { UserLocation } from '../types'

const DEFAULT_LOCATION: UserLocation = {
  lat: 32.0603,
  lng: 118.7969,
  city: '南京',
  district: '',
  address: '南京市',
  loaded: false,
}

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION)
  const [loading, setLoading] = useState(false)

  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    try {
      // Use bigdatacloud free reverse geocoding (no API key needed)
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=zh`
      )
      const data = await res.json()
      return {
        city: data.city || data.locality || '未知城市',
        district: data.localityInfo?.administrative?.[2]?.name || '',
        address: data.locality || data.city || '未知位置',
      }
    } catch {
      return { city: '未知城市', district: '', address: '未知位置' }
    }
  }, [])

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, loaded: true, error: '浏览器不支持定位' }))
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const addr = await fetchAddress(latitude, longitude)
        setLocation({
          lat: latitude,
          lng: longitude,
          city: addr.city,
          district: addr.district,
          address: addr.address,
          loaded: true,
        })
        setLoading(false)
      },
      async (err) => {
        // Fallback: try IP-based location
        try {
          const res = await fetch('https://api.ip.sb/geoip')
          const data = await res.json()
          const lat = data.latitude || DEFAULT_LOCATION.lat
          const lng = data.longitude || DEFAULT_LOCATION.lng
          const addr = await fetchAddress(lat, lng)
          setLocation({
            lat,
            lng,
            city: addr.city || data.city || '未知城市',
            district: addr.district,
            address: addr.address || data.city || '未知位置',
            loaded: true,
            error: 'GPS定位失败，已使用IP定位',
          })
        } catch {
          setLocation((prev) => ({
            ...prev,
            loaded: true,
            error: err.message || '定位失败，使用默认位置（南京）',
          }))
        }
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    )
  }, [fetchAddress])

  useEffect(() => {
    getLocation()
  }, [getLocation])

  return { location, loading, refresh: getLocation }
}
