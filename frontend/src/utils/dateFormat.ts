const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const dateTimePattern =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/

export function formatDate(value: string): string {
    const match = datePattern.exec(value.trim())

    if (!match) {
        return value
    }

    const [, year, month, day] = match

    return `${day}/${month}/${year}`
}

export function formatDateTime(value: string): string {
    const match = dateTimePattern.exec(value.trim())

    if (!match) {
        return value
    }

    const [, year, month, day, hour, minute] = match

    return `${day}/${month}/${year}, ${hour}:${minute}`
}