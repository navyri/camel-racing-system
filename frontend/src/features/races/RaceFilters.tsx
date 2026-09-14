import type { ChangeEvent, FormEvent } from 'react'
import {
    isRaceStatus,
    isRaceType,
    raceSortFields,
    raceStatuses,
    raceTypes,
    sortDirections,
    type RaceListFilters,
} from './raceTypes'

interface RaceFiltersProps {
    filters: RaceListFilters
    searchInput: string
    loading: boolean
    onStatusChange: (status: RaceListFilters['status']) => void
    onRaceTypeChange: (raceType: RaceListFilters['raceType']) => void
    onSearchInputChange: (search: string) => void
    onSearchSubmit: () => void
    onSizeChange: (size: number) => void
    onSortChange: (sort: string) => void
    onClearFilters: () => void
}

const pageSizes = [5, 10, 25, 50, 100]

function formatEnum(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function formatSortField(value: string): string {
    const labels: Record<string, string> = {
        name: 'Name',
        scheduledAt: 'Scheduled at',
        registrationDeadline: 'Registration deadline',
        createdAt: 'Created at',
        updatedAt: 'Updated at',
        maxParticipants: 'Maximum participants',
    }

    return labels[value] ?? value
}

export function RaceFilters({
    filters,
    searchInput,
    loading,
    onStatusChange,
    onRaceTypeChange,
    onSearchInputChange,
    onSearchSubmit,
    onSizeChange,
    onSortChange,
    onClearFilters,
}: RaceFiltersProps) {
    const [sortField, sortDirection] = filters.sort.split(',', 2)

    function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        onSearchSubmit()
    }

    function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
        const status = event.target.value

        onStatusChange(isRaceStatus(status) ? status : undefined)
    }

    function handleRaceTypeChange(event: ChangeEvent<HTMLSelectElement>) {
        const raceType = event.target.value

        onRaceTypeChange(isRaceType(raceType) ? raceType : undefined)
    }

    function handleSearchInputChange(event: ChangeEvent<HTMLInputElement>) {
        onSearchInputChange(event.target.value)
    }

    function handleSizeChange(event: ChangeEvent<HTMLSelectElement>) {
        onSizeChange(Number(event.target.value))
    }

    function handleSortFieldChange(event: ChangeEvent<HTMLSelectElement>) {
        onSortChange(`${event.target.value},${sortDirection}`)
    }

    function handleSortDirectionChange(event: ChangeEvent<HTMLSelectElement>) {
        onSortChange(`${sortField},${event.target.value}`)
    }

    return (
        <section className="race-filters race-filters-panel" aria-label="Race filters">
            <form className="race-filters-form" onSubmit={handleSearchSubmit}>
                <label className="filter-field">
                    Search
                    <input
                        type="search"
                        value={searchInput}
                        onChange={handleSearchInputChange}
                        placeholder="Name or location"
                        disabled={loading}
                    />
                </label>
                <button type="submit" disabled={loading}>
                    Search
                </button>
            </form>

            <label className="filter-field">
                Status
                <select
                    value={filters.status ?? ''}
                    onChange={handleStatusChange}
                    disabled={loading}
                >
                    <option value="">All statuses</option>
                    {raceStatuses.map((status) => (
                        <option key={status} value={status}>
                            {formatEnum(status)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="filter-field">
                Race type
                <select
                    value={filters.raceType ?? ''}
                    onChange={handleRaceTypeChange}
                    disabled={loading}
                >
                    <option value="">All race types</option>
                    {raceTypes.map((raceType) => (
                        <option key={raceType} value={raceType}>
                            {formatEnum(raceType)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="filter-field">
                Sort by
                <select
                    value={sortField}
                    onChange={handleSortFieldChange}
                    disabled={loading}
                >
                    {raceSortFields.map((field) => (
                        <option key={field} value={field}>
                            {formatSortField(field)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="filter-field">
                Direction
                <select
                    value={sortDirection}
                    onChange={handleSortDirectionChange}
                    disabled={loading}
                >
                    {sortDirections.map((direction) => (
                        <option key={direction} value={direction}>
                            {direction === 'asc' ? 'Ascending' : 'Descending'}
                        </option>
                    ))}
                </select>
            </label>

            <label className="filter-field">
                Results per page
                <select
                    value={filters.size}
                    onChange={handleSizeChange}
                    disabled={loading}
                >
                    {pageSizes.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </label>

            <button type="button" onClick={onClearFilters} disabled={loading}>
                Clear filters
            </button>
        </section>
    )
}