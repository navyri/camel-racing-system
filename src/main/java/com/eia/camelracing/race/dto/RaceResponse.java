package com.eia.camelracing.race.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;

public record RaceResponse(
        UUID id,
        String name,
        String description,
        LocalDateTime scheduledAt,
        String startLocation,
        String finishLocation,
        BigDecimal distanceMeters,
        int maxParticipants,
        RaceType raceType,
        RaceStatus status,
        UUID organizerId,
        String organizerUsername,
        LocalDateTime registrationDeadline,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}