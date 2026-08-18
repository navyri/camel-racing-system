package com.eia.camelracing.competitor.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;

public record CompetitorResponse(
        UUID id,
        String name,
        String nickname,
        CompetitorType competitorType,
        LocalDate dateOfBirth,
        Integer approximateAge,
        BigDecimal weightKg,
        BigDecimal heightCm,
        String origin,
        CompetitorStatus status,
        LocalDateTime registrationDate,
        int victories,
        int defeats,
        int completedRaces
) {
}