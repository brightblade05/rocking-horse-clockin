import { useEffect, useRef } from 'react'

export function useIdleTimeout(onIdle: () => void, timeoutMs: number = 60000) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const callbackRef = useRef(onIdle)

    useEffect(() => {
        callbackRef.current = onIdle
    }, [onIdle])

    useEffect(() => {
        const resetTimeout = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => {
                if (callbackRef.current) callbackRef.current()
            }, timeoutMs)
        }

        resetTimeout()

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
        events.forEach(e => document.addEventListener(e, resetTimeout))

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            events.forEach(e => document.removeEventListener(e, resetTimeout))
        }
    }, [timeoutMs])
}
