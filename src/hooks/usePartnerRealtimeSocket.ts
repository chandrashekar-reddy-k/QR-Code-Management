import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

let socket: Socket | null = null

function origin(): string {
  const o = (import.meta.env.VITE_CONSUMER_SOCKET_ORIGIN as string | undefined)?.trim()
  return (o || '').replace(/\/+$/, '')
}

export function usePartnerRealtimeSocket() {
  const started = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (started.current) return
    const base = origin()
    const token = localStorage.getItem('token')
    if (!base || !token) return
    started.current = true

    let user: { warehouseId?: string } = {}
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      user = {}
    }
    const warehouseId = user.warehouseId
    if (!warehouseId) {
      console.warn(
        '[PartnerRealtime] warehouseId missing on user — subscribe skipped; partner warehouse socket updates disabled until re-login.'
      )
    }

    socket?.disconnect()
    socket = io(`${base}/partner`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    })

    const sub = () => {
      if (!socket?.connected) return
      if (warehouseId) socket.emit('subscribe', { warehouseId })
    }

    socket.on('connect', sub)
    socket.on('reconnect', sub)

    const last = new Map<string, number>()
    const dedupe = (key: string) => {
      const t = Date.now()
      if (last.get(key) && t - (last.get(key) || 0) < 800) return true
      last.set(key, t)
      return false
    }

    const onOrder = (payload: Record<string, unknown>) => {
      const k = `o:${payload?.orderId}:${payload?.status}:${payload?.eventId || payload?.timestamp}`
      if (dedupe(k)) return
      toast.info('Order update received', { autoClose: 2500 })
    }

    const onAgentStatusUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryAgents'] })
      queryClient.invalidateQueries({ queryKey: ['deliveryAgentsByWarehouse'] })
      window.dispatchEvent(new Event('agentStatusUpdated'))
    }

    socket.on('partner:order_updated', onOrder)
    socket.on('partner:new_order', onOrder)
    socket.on('partner:delivery_assigned', onOrder)
    socket.on('partner:agent_status_updated', onAgentStatusUpdated)

    socket.connect()

    return () => {
      started.current = false
      socket?.off('partner:order_updated', onOrder)
      socket?.off('partner:new_order', onOrder)
      socket?.off('partner:delivery_assigned', onOrder)
      socket?.off('partner:agent_status_updated', onAgentStatusUpdated)
      socket?.disconnect()
      socket = null
    }
  }, [])
}
