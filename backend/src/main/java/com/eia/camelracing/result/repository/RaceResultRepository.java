package com.eia.camelracing.result.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.result.entity.RaceResult;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.standing.projection.CompetitorStandingProjection;
import com.eia.camelracing.standing.projection.TeamStandingProjection;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RaceResultRepository extends JpaRepository<RaceResult, UUID> {

        boolean existsByRegistrationId(UUID registrationId);

        boolean existsByRegistration_Race_IdAndFinalPositionAndStatus(
                        UUID raceId,
                        Integer finalPosition,
                        ResultStatus status);

        boolean existsByRegistration_Race_IdAndFinalPositionAndStatusAndIdNot(
                        UUID raceId,
                        Integer finalPosition,
                        ResultStatus status,
                        UUID id);

        @EntityGraph(attributePaths = {
                        "registration",
                        "registration.race",
                        "registration.competitor",
                        "registration.team",
                        "recordedBy"
        })
        @Query("""
                        select result
                        from RaceResult result
                        where result.registration.race.id = :raceId
                        order by
                                case when result.status = :finishedStatus then 0 else 1 end,
                                case when result.finalPosition is null then 1 else 0 end,
                                result.finalPosition asc,
                                result.recordedAt asc
                        """)
        List<RaceResult> findDetailedByRaceId(
                        @Param("raceId") UUID raceId,
                        @Param("finishedStatus") ResultStatus finishedStatus);

        @EntityGraph(attributePaths = {
                        "registration",
                        "registration.race",
                        "registration.competitor",
                        "registration.team",
                        "recordedBy"
        })
        Optional<RaceResult> findDetailedById(UUID id);

        @Query("""
                        select count(result) > 0
                        from RaceResult result
                        where result.registration.race.id = :raceId
                                and result.status = :finishedStatus
                                and result.finalPosition = :winnerPosition
                        """)
        boolean existsOfficialWinnerByRaceId(
                        @Param("raceId") UUID raceId,
                        @Param("finishedStatus") ResultStatus finishedStatus,
                        @Param("winnerPosition") Integer winnerPosition);

        @Query("""
                        select count(result)
                        from RaceResult result
                        where result.registration.competitor.id = :competitorId
                                and result.status in :statuses
                        """)
        long countByCompetitorIdAndStatusIn(
                        @Param("competitorId") UUID competitorId,
                        @Param("statuses") List<ResultStatus> statuses);

        @Query("""
                        select count(result)
                        from RaceResult result
                        where result.registration.competitor.id = :competitorId
                                and result.status = :status
                                and result.finalPosition = :finalPosition
                        """)
        long countByCompetitorIdAndStatusAndFinalPosition(
                        @Param("competitorId") UUID competitorId,
                        @Param("status") ResultStatus status,
                        @Param("finalPosition") Integer finalPosition);

        @Query("""
                        select count(result)
                        from RaceResult result
                        where result.registration.competitor.id = :competitorId
                                and (
                                        result.status = :didNotFinishStatus
                                        or result.status = :disqualifiedStatus
                                        or (
                                                result.status = :finishedStatus
                                                and result.finalPosition > :winnerPosition
                                        )
                                )
                        """)
        long countDefeatsByCompetitorId(
                        @Param("competitorId") UUID competitorId,
                        @Param("finishedStatus") ResultStatus finishedStatus,
                        @Param("didNotFinishStatus") ResultStatus didNotFinishStatus,
                        @Param("disqualifiedStatus") ResultStatus disqualifiedStatus,
                        @Param("winnerPosition") Integer winnerPosition);

        @Query("""
                        select count(result)
                        from RaceResult result
                        where result.registration.team.id = :teamId
                                and result.status = :finishedStatus
                                and result.finalPosition = :winnerPosition
                        """)
        long countVictoriesByTeamId(
                        @Param("teamId") UUID teamId,
                        @Param("finishedStatus") ResultStatus finishedStatus,
                        @Param("winnerPosition") Integer winnerPosition);

        @Query("""
                        select count(result)
                        from RaceResult result
                        where result.registration.team.id = :teamId
                                and (
                                        result.status = :didNotFinishStatus
                                        or result.status = :disqualifiedStatus
                                        or (
                                                result.status = :finishedStatus
                                                and result.finalPosition > :winnerPosition
                                        )
                                )
                        """)
        long countDefeatsByTeamId(
                        @Param("teamId") UUID teamId,
                        @Param("finishedStatus") ResultStatus finishedStatus,
                        @Param("didNotFinishStatus") ResultStatus didNotFinishStatus,
                        @Param("disqualifiedStatus") ResultStatus disqualifiedStatus,
                        @Param("winnerPosition") Integer winnerPosition);

        @Query("""
                        select new com.eia.camelracing.standing.projection.CompetitorStandingProjection(
                                competitor.id,
                                competitor.name,
                                competitor.nickname,
                                sum(
                                        case
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 1 then 10
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 2 then 7
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 3 then 5
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 4 then 3
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 5 then 1
                                                else 0
                                        end
                                )
                        )
                        from RaceResult result
                        join result.registration registration
                        join registration.competitor competitor
                        group by competitor.id, competitor.name, competitor.nickname
                        order by
                                sum(
                                        case
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 1 then 10
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 2 then 7
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 3 then 5
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 4 then 3
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 5 then 1
                                                else 0
                                        end
                                ) desc,
                                competitor.name asc,
                                competitor.nickname asc,
                                competitor.id asc
                        """)
        List<CompetitorStandingProjection> findCompetitorStandings(
                        @Param("finishedStatus") ResultStatus finishedStatus);

        @Query("""
                        select new com.eia.camelracing.standing.projection.TeamStandingProjection(
                                team.id,
                                team.name,
                                sum(
                                        case
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 1 then 10
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 2 then 7
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 3 then 5
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 4 then 3
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 5 then 1
                                                else 0
                                        end
                                )
                        )
                        from RaceResult result
                        join result.registration registration
                        join registration.team team
                        group by team.id, team.name
                        order by
                                sum(
                                        case
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 1 then 10
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 2 then 7
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 3 then 5
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 4 then 3
                                                when result.status = :finishedStatus
                                                        and result.finalPosition = 5 then 1
                                                else 0
                                        end
                                ) desc,
                                team.name asc,
                                team.id asc
                        """)
        List<TeamStandingProjection> findTeamStandings(
                        @Param("finishedStatus") ResultStatus finishedStatus);
}
