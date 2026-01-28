/**
 * CUSTOM REACT HOOKS
 * 
 * Reusable hooks for common patterns.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for polling an endpoint (used with Remotion Lambda)
 */
export function usePolling<T>(
    url: string | null,
    options: {
        interval?: number;
        onComplete?: (data: T) => void;
        onError?: (error: Error) => void;
        shouldStop?: (data: T) => boolean;
    } = {}
) {
    const { interval = 2000, onComplete, onError, shouldStop } = options;
    const [data, setData] = useState<T | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();

    const stop = useCallback(() => {
        setIsPolling(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const start = useCallback(() => {
        setIsPolling(true);
        setError(null);
    }, []);

    useEffect(() => {
        if (!url || !isPolling) return;

        const poll = async () => {
            try {
                const response = await fetch(url);
                const result = await response.json() as T;
                setData(result);

                if (shouldStop?.(result)) {
                    stop();
                    onComplete?.(result);
                } else {
                    timeoutRef.current = setTimeout(poll, interval);
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                stop();
                onError?.(error);
            }
        };

        poll();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [url, isPolling, interval, shouldStop, onComplete, onError, stop]);

    return { data, isPolling, error, start, stop };
}

/**
 * Hook for local storage with SSR safety
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error('useLocalStorage error:', error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue] as const;
}

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook for tracking mounted state
 */
export function useMounted() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return mounted;
}

/**
 * Hook for previous value
 */
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}
