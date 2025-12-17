import { getIdToken } from './client'

/**
 * Fetch wrapper that automatically injects Firebase ID token
 * Falls back to regular fetch if not authenticated
 */
export async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    console.log('[authFetch] Starting request to:', input)
    const token = await getIdToken()
    console.log('[authFetch] Token received:', token ? 'YES (' + token.substring(0, 15) + '...)' : 'NO (null)')

    const headers = new Headers(init?.headers)

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
        console.log('[authFetch] Authorization header set')
    } else {
        console.warn('[authFetch] No token, proceeding without auth')
    }

    const response = await fetch(input, {
        ...init,
        headers,
    })

    console.log('[authFetch] Response status:', response.status, response.statusText)
    return response
}

/**
 * JSON fetch helper with auth
 */
export async function authFetchJson<T>(
    url: string,
    options?: RequestInit & { body?: unknown }
): Promise<T> {
    const init: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
    }

    if (options?.body && typeof options.body !== 'string') {
        init.body = JSON.stringify(options.body)
    }

    const response = await authFetch(url, init)

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
}
