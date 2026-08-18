package com.eia.camelracing.registration.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;

public interface RaceRegistrationRepository extends JpaRepository<RaceRegistration, UUID> {

    boolean existsByRaceIdAndCompetitorId(UUID raceId, UUID competitorId);

    boolean existsByRaceIdAndTeamId(UUID raceId, UUID teamId);

    boolean existsByRaceIdAndStartingPosition(UUID raceId, Integer startingPosition);

    long countByRaceIdAndStatus(UUID raceId, RegistrationStatus status);

    List<RaceRegistration> findByRaceId(UUID raceId);

    @Query("""
            select count(registration) > 0
            from RaceRegistration registration
            join registration.team team
            join TeamMember member on member.team = team
            where registration.race.id = :raceId
                and member.competitor.id = :competitorId
                and member.active = true
            """)
    boolean existsTeamRegistrationForCompetitor(
            @Param("raceId") UUID raceId,
            @Param("competitorId") UUID competitorId);
}