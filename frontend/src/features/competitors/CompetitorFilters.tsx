import type { ChangeEvent, FormEvent } from 'react'
import {
    competitorSortFields,
    competitorStatuses,
    competitorTypes,
    isCompetitorStatus,
    isCompetitorType,
    sortDirections,
    type CompetitorListFilters,
} from './competitorTypes'

interface CompetitorFiltersProps {
    filters: CompetitorListFilters
    searchInput: string
    originInput: string
    loading: boolean
    onTypeChange: (type: CompetitorListFilters['type']) => void
    onStatusChange: (status: CompetitorListFilters['status']) => void
    onSearchInputChange: (search: string) => void
    onOriginInputChange: (origin: string) => void
    onFilterSubmit: () => void
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
        nickname: 'Nickname',
        registrationDate: 'Registration date',
        victories: 'Victories',
        defeats: 'Defeats',
        completedRaces: 'Completed races',
    }

    return labels[value] ?? value
}

export function CompetitorFilters({
    filters,
    searchInput,
    originInput,
    loading,
    onTypeChange,
    onStatusChange,
    onSearchInputChange,
    onOriginInputChange,
    onFilterSubmit,
    onSizeChange,
    onSortChange,
    onClearFilters,
}: CompetitorFiltersProps) {
    const [sortField, sortDirection] = filters.sort.split(',', 2)

    function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        onFilterSubmit()
    }

    function handleTypeChange(event: ChangeEvent<HTMLSelectElement>) {
        const type = event.target.value

        onTypeChange(isCompetitorType(type) ? type : undefined)
    }

    function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
        const status = event.target.value

        onStatusChange(isCompetitorStatus(status) ? status : undefined)
    }

    function handleSearchInputChange(event: ChangeEvent<HTMLInputElement>) {
        onSearchInputChange(event.target.value)
    }

    function handleOriginInputChange(event: ChangeEvent<HTMLInputElement>) {
        onOriginInputChange(event.target.value)
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
        <section
            className="competitor-filters competitor-filters-panel"
            aria-label="Competitor filters"
        >
            <form className="competitor-filters-form" onSubmit={handleFilterSubmit}>
                <label className="filter-field">
                    Search
                    <input
                        type="search"
                        value={searchInput}
                        onChange={handleSearchInputChange}
                        placeholder="Name or nickname"
                        disabled={loading}
                    />
                </label>

                <label className="filter-field">
                    Origin
                    <input
                        type="search"
                        value={originInput}
                        onChange={handleOriginInputChange}
                        placeholder="Country or place"
                        disabled={loading}
                    />
                </label>

                <button type="submit" disabled={loading}>
                    Search
                </button>
            </form>

            <label className="filter-field">
                Competitor type
                <select
                    value={filters.type ?? ''}
                    onChange={handleTypeChange}
                    disabled={loading}
                >
                    <option value="">All competitor types</option>
                    {competitorTypes.map((type) => (
                        <option key={type} value={type}>
                            {formatEnum(type)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="filter-field">
                Status
                <select
                    value={filters.status ?? ''}
                    onChange={handleStatusChange}
                    disabled={loading}
                >
                    <option value="">All statuses</option>
                    {competitorStatuses.map((status) => (
                        <option key={status} value={status}>
                            {formatEnum(status)}
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
                    {competitorSortFields.map((field) => (
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