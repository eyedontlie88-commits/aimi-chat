import { getIdToken } from './client'

/**
 * Fetch wrapper that automatically injects Firebase ID token
 * Falls back to regular fetch if not authenticated
 */
export async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const token = await getIdToken()

    const headers = new Headers(init?.headers)

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    return fetch(input, {
        ...init,
        headers,
    })
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
