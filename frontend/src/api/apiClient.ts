import { ApiError } from './apiError'
import { keycloak } from '../auth/keycloak'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown
    headers?: HeadersInit
    requiresAuth?: boolean
}

function buildUrl(path: string): string {
    return new URL(path, apiBaseUrl).toString()
}

async function readResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
        return response.json()
    }

    const text = await response.text()
    return text.length > 0 ? text : null
}

export async function apiClient<T>(
    path: string,
    options: ApiRequestOptions = {},
): Promise<T> {
    const {
        body,
        headers,
        requiresAuth = true,
        ...requestOptions
    } = options

    const requestHeaders = new Headers(headers)

    if (body !== undefined && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
    }

    if (requiresAuth) {
        await keycloak.updateToken(30)

        if (!keycloak.token) {
            throw new ApiError('No authenticated access token is available.', 401)
        }

        requestHeaders.set('Authorization', `Bearer ${keycloak.token}`)
    }

    const response = await fetch(buildUrl(path), {
        ...requestOptions,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: requestHeaders,
    })

    const responseBody = await readResponseBody(response)

    if (!response.ok) {
        const message =
            typeof responseBody === 'object' &&
                responseBody !== null &&
                'message' in responseBody &&
                typeof responseBody.message === 'string'
                ? responseBody.message
                : `Request failed with status ${response.status}.`

        throw new ApiError(message, response.status, responseBody)
    }

    return responseBody as T
}