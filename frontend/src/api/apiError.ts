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