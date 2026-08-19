package com.eia.camelracing.registration.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.registration.entity.RegistrationStatus;

public record RaceRegistrationResponse(
        UUID id,

        UUID raceId,

        UUID competitorId,

        String competitorName,

        String competitorNickname,

        UUID teamId,

        String teamName,

        LocalDateTime registeredAt,

        RegistrationStatus status,

        Integer startingPosition,

        String validationNotes,

        UUID registeredByUserId,

        String registeredByUsername
) {
}