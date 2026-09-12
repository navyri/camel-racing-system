package com.eia.camelracing.result.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.result.entity.ResultStatus;

public record RaceResultResponse(
        UUID id,

        UUID raceId,

        String raceName,

        UUID registrationId,

        UUID competitorId,

        String competitorName,

        String competitorNickname,

        UUID teamId,

        String teamName,

        Integer startingPosition,

        Integer finalPosition,

        Long completionTimeSeconds,

        Long penaltyTimeSeconds,

        ResultStatus status,

        String notes,

        UUID recordedByUserId,

        String recordedByUsername,

        LocalDateTime recordedAt) {
}