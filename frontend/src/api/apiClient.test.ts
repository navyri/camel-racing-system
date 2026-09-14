import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './apiError'

const updateToken = vi.fn()
const keycloak = {
    token: 'initial-token',
    updateToken,
}

vi.mock('../auth/keycloak', () => ({
    keycloak,
}))

const { apiClient } = await import('./apiClient')

afterEach(() => {
    vi.restoreAllMocks()
    updateToken.mockReset()
    keycloak.token = 'initial-token'
})

describe('apiClient', () => {
    it('refreshes the token and adds the bearer authorization header', async () => {
        updateToken.mockResolvedValue(true)

        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ id: 'race-1' }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        )

        await expect(apiClient<{ id: string }>('/api/races/1')).resolves.toEqual({
            id: 'race-1',
        })

        expect(updateToken).toHaveBeenCalledWith(30)
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:8080/api/races/1',
            expect.objectContaining({
                headers: expect.any(Headers),
            }),
        )

        const request = fetchMock.mock.calls[0]?.[1] as RequestInit
        const headers = request.headers as Headers

        expect(headers.get('Authorization')).toBe('Bearer initial-token')
    })

    it('throws ApiError when the response is not successful', async () => {
        updateToken.mockResolvedValue(true)

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ message: 'Race not found' }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        )

        let receivedError: unknown

        try {
            await apiClient('/api/races/missing')
        } catch (error) {
            receivedError = error
        }

        expect(receivedError).toBeInstanceOf(ApiError)
        expect(receivedError).toMatchObject({
            name: 'ApiError',
            status: 404,
            message: 'Race not found',
        })
    })

    it('does not request a token for explicitly public calls', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        )

        await expect(
            apiClient('/api/public-status', {
                requiresAuth: false,
            }),
        ).resolves.toEqual([])

        expect(updateToken).not.toHaveBeenCalled()
    })
})