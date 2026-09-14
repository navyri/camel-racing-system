package com.eia.camelracing.race.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RaceRepository extends JpaRepository<Race, UUID> {

    List<Race> findByStatusAndScheduledAtAfterOrderByScheduledAtAsc(
            RaceStatus status,
            LocalDateTime scheduledAt);

    @Query("""
            select race
            from Race race
            where (:status is null or race.status = :status)
                and (:raceType is null or race.raceType = :raceType)
                and (
                    coalesce(:search, '') = ''
                    or lower(race.name) like lower(concat('%', coalesce(:search, ''), '%'))
                    or lower(race.startLocation) like lower(concat('%', coalesce(:search, ''), '%'))
                    or lower(race.finishLocation) like lower(concat('%', coalesce(:search, ''), '%'))
                )
            """)
    Page<Race> findAllByFilters(
            @Param("status") RaceStatus status,
            @Param("raceType") RaceType raceType,
            @Param("search") String search,
            Pageable pageable);
}