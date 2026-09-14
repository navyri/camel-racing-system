package com.eia.camelracing.registration.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RaceRegistrationRepository extends JpaRepository<RaceRegistration, UUID> {

    boolean existsByRaceIdAndCompetitorId(UUID raceId, UUID competitorId);

    boolean existsByRaceIdAndTeamId(UUID raceId, UUID teamId);

    @Query("""
            select count(registration)
            from RaceRegistration registration
            where registration.race.id = :raceId
                and registration.status in :statuses
            """)
    long countByRaceIdAndStatusIn(
            @Param("raceId") UUID raceId,
            @Param("statuses") List<RegistrationStatus> statuses);

    @Query("""
            select count(registration) > 0
            from RaceRegistration registration
            where registration.race.id = :raceId
                and registration.startingPosition = :startingPosition
                and registration.status in :statuses
            """)
    boolean existsByRaceIdAndStartingPositionAndStatusIn(
            @Param("raceId") UUID raceId,
            @Param("startingPosition") Integer startingPosition,
            @Param("statuses") List<RegistrationStatus> statuses);

    @EntityGraph(attributePaths = {
            "race",
            "competitor",
            "team",
            "registeredBy"
    })
    List<RaceRegistration> findByRaceIdOrderByRegisteredAtAsc(UUID raceId);

    @EntityGraph(attributePaths = {
            "race",
            "competitor",
            "team",
            "registeredBy"
    })
    Optional<RaceRegistration> findDetailedById(UUID id);

    @Query("""
            select count(registration) > 0
            from RaceRegistration registration
            join registration.team team
            join TeamMember member on member.team = team
            where registration.race.id = :raceId
                and member.competitor.id = :competitorId
                and member.active = true
                and registration.status in :statuses
            """)
    boolean existsActiveTeamRegistrationForCompetitor(
            @Param("raceId") UUID raceId,
            @Param("competitorId") UUID competitorId,
            @Param("statuses") List<RegistrationStatus> statuses);

    @Query("""
            select count(registration) > 0
            from RaceRegistration registration
            join TeamMember member on member.team = :team
            where registration.race.id = :raceId
                and registration.competitor = member.competitor
                and member.active = true
                and registration.status in :statuses
            """)
    boolean existsIndividualRegistrationForActiveTeamMember(
            @Param("raceId") UUID raceId,
            @Param("team") com.eia.camelracing.team.entity.Team team,
            @Param("statuses") List<RegistrationStatus> statuses);
}