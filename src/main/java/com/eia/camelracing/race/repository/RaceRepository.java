package com.eia.camelracing.race.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;

public interface RaceRepository extends JpaRepository<Race, UUID> {

    List<Race> findByStatusAndScheduledAtAfterOrderByScheduledAtAsc(
            RaceStatus status,
            LocalDateTime scheduledAt
    );
}