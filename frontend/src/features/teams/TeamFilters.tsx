import type {
    TeamFiltersState,
    TeamStatus,
} from './teamTypes'
import {
    teamPageSizes,
    teamSortFields,
} from './teamTypes'

interface TeamFiltersProps {
    filters: TeamFiltersState
    disabled: boolean
    onChange: (filters: TeamFiltersState) => void
    onRefresh: () => void
}

export function TeamFilters({
    filters,
    disabled,
    onChange,
    onRefresh,
}: TeamFiltersProps) {
    function updateFilters(
        changes: Partial<TeamFiltersState>,
    ) {
        onChange({
            ...filters,
            ...changes,
            page: changes.page ?? 0,
        })
    }

    function handleSearchSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()
        updateFilters({
            page: 0,
        })
    }

    return (
        <section
            className="team-filters"
            aria-label="Team filters"
        >
            <form
                className="team-filters-form"
                onSubmit={handleSearchSubmit}
            >
                <label htmlFor="team-search">
                    Search teams
                    <input
                        id="team-search"
                        type="search"
                        value={filters.search}
                        onChange={(event) =>
                            updateFilters({
                                search: event.target.value,
                            })
                        }
                        placeholder="Team or coach name"
                        disabled={disabled}
                    />
                </label>

                <button
                    type="submit"
                    disabled={disabled}
                >
                    Search
                </button>
            </form>

            <label
                className="filter-field"
                htmlFor="team-status-filter"
            >
                Status
                <select
                    id="team-status-filter"
                    value={filters.status}
                    onChange={(event) =>
                        updateFilters({
                            status: event.target.value as TeamStatus | '',
                        })
                    }
                    disabled={disabled}
                >
                    <option value="">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
            </label>

            <label
                className="filter-field"
                htmlFor="team-sort-filter"
            >
                Sort teams
                <select
                    id="team-sort-filter"
                    value={filters.sort}
                    onChange={(event) =>
                        updateFilters({
                            sort: event.target.value,
                        })
                    }
                    disabled={disabled}
                >
                    {teamSortFields.map((sortField) => (
                        <option
                            key={sortField.value}
                            value={sortField.value}
                        >
                            {sortField.label}
                        </option>
                    ))}
                </select>
            </label>

            <label
                className="filter-field"
                htmlFor="team-page-size"
            >
                Results per page
                <select
                    id="team-page-size"
                    value={filters.size}
                    onChange={(event) =>
                        updateFilters({
                            size: Number(event.target.value),
                        })
                    }
                    disabled={disabled}
                >
                    {teamPageSizes.map((pageSize) => (
                        <option
                            key={pageSize}
                            value={pageSize}
                        >
                            {pageSize}
                        </option>
                    ))}
                </select>
            </label>

            <button
                type="button"
                onClick={onRefresh}
                disabled={disabled}
            >
                Refresh teams
            </button>
        </section>
    )
}