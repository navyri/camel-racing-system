package com.eia.camelracing.competitor.dto;

import com.eia.camelracing.competitor.entity.CompetitorStatus;

import jakarta.validation.constraints.NotNull;

public record CompetitorStatusRequest(
        @NotNull(message = "Status is required")
        CompetitorStatus status
) {
}