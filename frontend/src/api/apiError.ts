export interface ErrorResponse {
    timestamp: string
    status: number
    error: string
    message: string
    path: string
    validationErrors?: Record<string, string>
}

export class ApiError extends Error {
    public readonly status: number
    public readonly body: unknown

    constructor(message: string, status: number, body: unknown = null) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.body = body
    }
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isValidationErrors(value: unknown): value is Record<string, string> {
    if (!isStringRecord(value)) {
        return false
    }

    return Object.values(value).every((message) => typeof message === 'string')
}

export function isErrorResponse(value: unknown): value is ErrorResponse {
    if (!isStringRecord(value)) {
        return false
    }

    return (
        typeof value.timestamp === 'string' &&
        typeof value.status === 'number' &&
        typeof value.error === 'string' &&
        typeof value.message === 'string' &&
        typeof value.path === 'string' &&
        (value.validationErrors === undefined ||
            isValidationErrors(value.validationErrors))
    )
}

export function getApiValidationErrors(
    error: unknown,
): Record<string, string> | undefined {
    if (!(error instanceof ApiError) || !isErrorResponse(error.body)) {
        return undefined
    }

    return error.body.validationErrors
}