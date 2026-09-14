import {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom'

import {
    addTeamMember,
    deactivateTeam,
    getTeamById,
    removeTeamMember,
} from '../../api/teamsApi'
import { ApiError } from '../../api/apiError'
import { getCompetitors } from '../../api/competitorsApi'
import { AuthContext } from '../../auth/AuthContext'
import { EmptyState } from '../../components/common/EmptyState'
import { ErrorState } from '../../components/common/ErrorState'
import { LoadingState } from '../../components/common/LoadingState'
import { formatDateTime } from '../../utils/dateFormat'
import { TeamActionDialog } from './TeamActionDialog'
import {
    TeamMemberDialog,
    type TeamMemberOption,
} from './TeamMemberDialog'
import {
    getTeamRecordLabel,
    getTeamStatusClassName,
    getTeamStatusLabel,
    type TeamMemberResponse,
    type TeamResponse,
} from './teamTypes'

type PendingAction =
    | {
          type: 'remove-member'
          member: TeamMemberResponse
      }
    | {
          type: 'deactivate-team'
      }
    | null

function getTeamActionErrorMessage(
    error: unknown,
    action: 'add-member' | 'remove-member' | 'deactivate-team',
): string {
    if (error instanceof ApiError) {
        if (error.status === 403) {
            return 'You do not have permission to manage this team.'
        }

        if (error.status === 404) {
            return 'The requested team or competitor record was not found.'
        }

        return error.message
    }

    if (action === 'add-member') {
        return 'The team member could not be added. Please try again.'
    }

    if (action === 'remove-member') {
        return 'The team member could not be removed. Please try again.'
    }

    return 'The team could not be deactivated. Please try again.'
}

function toTeamMemberOptions(
    competitors: Array<{
        id: string
        name: string
        nickname: string
        competitorType: string
    }>,
    members: TeamMemberResponse[],
): TeamMemberOption[] {
    const memberIds = new Set(
        members.map((member) => member.competitorId),
    )

    return competitors
        .filter((competitor) => !memberIds.has(competitor.id))
        .map((competitor) => ({
            id: competitor.id,
            name: competitor.name,
            nickname: competitor.nickname,
            competitorType: competitor.competitorType,
        }))
}

export function TeamDetailPage() {
    const auth = useContext(AuthContext)
    const navigate = useNavigate()
    const { teamId } = useParams()

    const addMemberTriggerRef = useRef<HTMLButtonElement>(null)
    const actionTriggerRef = useRef<HTMLElement | null>(null)

    const [team, setTeam] = useState<TeamResponse | null>(null)
    const [availableMembers, setAvailableMembers] = useState<
        TeamMemberOption[]
    >([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [memberDialogOpen, setMemberDialogOpen] = useState(false)
    const [pendingAction, setPendingAction] =
        useState<PendingAction>(null)
    const [dialogError, setDialogError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [reloadIndex, setReloadIndex] = useState(0)

    const canManageTeams =
        auth?.hasRole('ADMINISTRATOR') ?? false

    const loadTeam = useCallback(
        async (showRefreshState: boolean) => {
            if (!teamId) {
                setLoadError('Team was not found.')
                setIsLoading(false)
                return
            }

            try {
                const loadedTeam = await getTeamById(teamId)

                let members: TeamMemberOption[] = []

                if (
                    canManageTeams &&
                    loadedTeam.status === 'ACTIVE'
                ) {
                    const competitorsPage = await getCompetitors({
                        status: 'ACTIVE',
                        page: 0,
                        size: 100,
                        sort: 'name,asc',
                    })

                    members = toTeamMemberOptions(
                        competitorsPage.content,
                        loadedTeam.members,
                    )
                }

                setTeam(loadedTeam)
                setAvailableMembers(members)
                setLoadError(null)
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    setLoadError('Team was not found.')
                } else if (
                    error instanceof ApiError &&
                    error.status === 403
                ) {
                    setLoadError(
                        'You do not have permission to view this team.',
                    )
                } else {
                    setLoadError(
                        'Team details could not be loaded. Please try again.',
                    )
                }
            } finally {
                if (showRefreshState) {
                    setIsRefreshing(false)
                } else {
                    setIsLoading(false)
                }
            }
        },
        [canManageTeams, teamId],
    )

    useEffect(() => {
        void Promise.resolve().then(() => loadTeam(false))
    }, [loadTeam, reloadIndex])

    function handleRefresh() {
        setIsRefreshing(true)
        setReloadIndex((currentValue) => currentValue + 1)
    }

    function handleRetryLoad() {
        setIsLoading(true)
        setLoadError(null)
        setReloadIndex((currentValue) => currentValue + 1)
    }

    function handleOpenMemberDialog() {
        setDialogError(null)
        setMemberDialogOpen(true)
    }

    function handleCloseMemberDialog() {
        if (isSubmitting) {
            return
        }

        setMemberDialogOpen(false)
        setDialogError(null)

        window.setTimeout(() => {
            addMemberTriggerRef.current?.focus()
        }, 0)
    }

    function openRemoveMemberDialog(member: TeamMemberResponse) {
        actionTriggerRef.current = document.activeElement as HTMLElement
        setDialogError(null)
        setPendingAction({
            type: 'remove-member',
            member,
        })
    }

    function openDeactivateTeamDialog() {
        actionTriggerRef.current = document.activeElement as HTMLElement
        setDialogError(null)
        setPendingAction({
            type: 'deactivate-team',
        })
    }

    function closeActionDialog() {
        if (isSubmitting) {
            return
        }

        setPendingAction(null)
        setDialogError(null)

        window.setTimeout(() => {
            actionTriggerRef.current?.focus()
        }, 0)
    }

    async function handleAddMember(competitorId: string) {
        if (!teamId) {
            return
        }

        setIsSubmitting(true)
        setDialogError(null)

        try {
            const updatedTeam = await addTeamMember(
                teamId,
                competitorId,
            )

            setTeam(updatedTeam)
            setAvailableMembers((currentMembers) =>
                currentMembers.filter(
                    (member) => member.id !== competitorId,
                ),
            )
            setMemberDialogOpen(false)

            window.setTimeout(() => {
                addMemberTriggerRef.current?.focus()
            }, 0)
        } catch (error) {
            setDialogError(
                getTeamActionErrorMessage(error, 'add-member'),
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleConfirmAction() {
        if (!teamId || !pendingAction) {
            return
        }

        setIsSubmitting(true)
        setDialogError(null)

        try {
            if (pendingAction.type === 'remove-member') {
                const removedMember = pendingAction.member

                await removeTeamMember(
                    teamId,
                    removedMember.competitorId,
                )

                setTeam((currentTeam) => {
                    if (!currentTeam) {
                        return currentTeam
                    }

                    return {
                        ...currentTeam,
                        members: currentTeam.members.filter(
                            (member) =>
                                member.competitorId !==
                                removedMember.competitorId,
                        ),
                    }
                })

                setAvailableMembers((currentMembers) => [
                    ...currentMembers,
                    {
                        id: removedMember.competitorId,
                        name: removedMember.name,
                        nickname: removedMember.nickname,
                        competitorType: removedMember.competitorType,
                    },
                ])

                setPendingAction(null)

                window.setTimeout(() => {
                    actionTriggerRef.current?.focus()
                }, 0)

                return
            }

            await deactivateTeam(teamId)

            navigate('/teams', {
                replace: true,
            })
        } catch (error) {
            setDialogError(
                getTeamActionErrorMessage(
                    error,
                    pendingAction.type === 'remove-member'
                        ? 'remove-member'
                        : 'deactivate-team',
                ),
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return <LoadingState message="Loading team record..." />
    }

    if (loadError) {
        return (
            <section className="team-page">
                <header className="team-detail-header">
                    <div>
                        <p className="team-kicker">Team registry</p>
                        <h1>Team record unavailable</h1>
                        <p>{loadError}</p>
                    </div>
                </header>

                <ErrorState message={loadError} />

                <div className="team-detail-actions">
                    <button
                        type="button"
                        onClick={handleRetryLoad}
                    >
                        Retry
                    </button>

                    <Link
                        className="team-action-link team-action-link-secondary"
                        to="/teams"
                    >
                        Return to teams
                    </Link>
                </div>
            </section>
        )
    }

    if (!team) {
        return (
            <section className="team-page">
                <header className="team-detail-header">
                    <div>
                        <p className="team-kicker">Team registry</p>
                        <h1>Team not found</h1>
                        <p>
                            The requested team record is unavailable.
                        </p>
                    </div>
                </header>

                <Link
                    className="team-action-link"
                    to="/teams"
                >
                    Return to teams
                </Link>
            </section>
        )
    }

    const canAddMembers =
        canManageTeams && team.status === 'ACTIVE'

    const pendingActionTitle =
        pendingAction?.type === 'remove-member'
            ? 'Remove team member'
            : 'Deactivate team'

    const pendingActionDescription =
        pendingAction?.type === 'remove-member'
            ? `Remove ${pendingAction.member.name} from ${team.name}? Their membership will be marked inactive and can no longer be used for active team registrations.`
            : `Deactivate ${team.name}? The team will become inactive and cannot receive new members.`

    const pendingActionLabel =
        pendingAction?.type === 'remove-member'
            ? 'Remove member'
            : 'Deactivate team'

    return (
        <section className="team-page">
            <header className="team-detail-header">
                <div>
                    <p className="team-kicker">Team registry</p>
                    <h1>{team.name}</h1>
                    <p>{team.description}</p>
                </div>

                <span
                    className={`team-status-badge ${getTeamStatusClassName(
                        team.status,
                    )}`}
                >
                    {getTeamStatusLabel(team.status)}
                </span>
            </header>

            {isRefreshing ? (
                <section
                    className="team-refresh-message"
                    aria-live="polite"
                >
                    Refreshing team record...
                </section>
            ) : null}

            <section className="team-detail-grid">
                <article className="team-detail-panel">
                    <h2>Team profile</h2>
                    <dl className="team-detail-list">
                        <div>
                            <dt>Coach</dt>
                            <dd>{team.coachName}</dd>
                        </div>
                        <div>
                            <dt>Created</dt>
                            <dd>{formatDateTime(team.createdAt)}</dd>
                        </div>
                        <div>
                            <dt>Status</dt>
                            <dd>{getTeamStatusLabel(team.status)}</dd>
                        </div>
                    </dl>
                </article>

                <article className="team-detail-panel">
                    <h2>Race record</h2>
                    <dl className="team-detail-list">
                        <div>
                            <dt>Victories</dt>
                            <dd>{team.victories}</dd>
                        </div>
                        <div>
                            <dt>Defeats</dt>
                            <dd>{team.defeats}</dd>
                        </div>
                        <div>
                            <dt>Summary</dt>
                            <dd>
                                {getTeamRecordLabel(
                                    team.victories,
                                    team.defeats,
                                )}
                            </dd>
                        </div>
                    </dl>
                </article>

                <article className="team-detail-panel">
                    <h2>Active members</h2>
                    <dl className="team-detail-list">
                        <div>
                            <dt>Current members</dt>
                            <dd>{team.members.length}</dd>
                        </div>
                        <div>
                            <dt>Registration status</dt>
                            <dd>
                                {team.members.length > 0
                                    ? 'Ready for team registration'
                                    : 'At least one active member is required'}
                            </dd>
                        </div>
                    </dl>
                </article>
            </section>

            <section
                className="team-members-section"
                aria-labelledby="team-members-heading"
            >
                <div className="team-members-heading">
                    <div>
                        <p className="team-kicker">Roster</p>
                        <h2 id="team-members-heading">
                            Active members
                        </h2>
                        <p>
                            Only active memberships appear in this roster.
                        </p>
                    </div>

                    {canAddMembers ? (
                        <button
                            ref={addMemberTriggerRef}
                            type="button"
                            onClick={handleOpenMemberDialog}
                        >
                            Add member
                        </button>
                    ) : null}
                </div>

                {!canManageTeams ? (
                    <section
                        className="team-read-only-notice"
                        aria-label="Read only access"
                    >
                        Read-only access. Only administrators can manage team
                        records and memberships.
                    </section>
                ) : null}

                {canManageTeams && team.status !== 'ACTIVE' ? (
                    <section
                        className="team-read-only-notice"
                        aria-label="Inactive team notice"
                    >
                        Only active teams can receive new members.
                    </section>
                ) : null}

                {team.members.length === 0 ? (
                    <EmptyState
                        title="No active team members"
                        message="Add an active competitor before using this team in a team registration."
                    />
                ) : (
                    <section
                        className="team-table-panel"
                        aria-label="Active team members"
                    >
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Competitor</th>
                                        <th scope="col">Nickname</th>
                                        <th scope="col">Type</th>
                                        <th scope="col">Joined</th>
                                        {canManageTeams ? (
                                            <th scope="col">Actions</th>
                                        ) : null}
                                    </tr>
                                </thead>
                                <tbody>
                                    {team.members.map((member) => (
                                        <tr key={member.competitorId}>
                                            <td>{member.name}</td>
                                            <td>
                                                {member.nickname || 'Not set'}
                                            </td>
                                            <td>
                                                {member.competitorType}
                                            </td>
                                            <td>
                                                {formatDateTime(
                                                    member.joinedAt,
                                                )}
                                            </td>
                                            {canManageTeams ? (
                                                <td>
                                                    <button
                                                        className="team-danger-button"
                                                        type="button"
                                                        onClick={() =>
                                                            openRemoveMemberDialog(
                                                                member,
                                                            )
                                                        }
                                                    >
                                                        Remove member
                                                    </button>
                                                </td>
                                            ) : null}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </section>

            <div className="team-detail-actions">
                <Link
                    className="team-action-link team-action-link-secondary"
                    to="/teams"
                >
                    Return to teams
                </Link>

                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    {isRefreshing
                        ? 'Refreshing team...'
                        : 'Refresh team'}
                </button>

                {canManageTeams ? (
                    <Link
                        className="team-action-link"
                        to={`/teams/${team.id}/edit`}
                    >
                        Edit team
                    </Link>
                ) : null}

                {canManageTeams && team.status !== 'INACTIVE' ? (
                    <button
                        className="team-danger-button"
                        type="button"
                        onClick={openDeactivateTeamDialog}
                    >
                        Deactivate team
                    </button>
                ) : null}
            </div>

            <TeamMemberDialog
                isOpen={memberDialogOpen}
                isSubmitting={isSubmitting}
                errorMessage={dialogError}
                competitors={availableMembers}
                onClose={handleCloseMemberDialog}
                onConfirm={handleAddMember}
            />

            <TeamActionDialog
                isOpen={pendingAction !== null}
                title={pendingActionTitle}
                description={pendingActionDescription}
                confirmLabel={pendingActionLabel}
                isSubmitting={isSubmitting}
                errorMessage={dialogError}
                danger
                onClose={closeActionDialog}
                onConfirm={handleConfirmAction}
            />
        </section>
    )
}