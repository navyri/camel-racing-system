package com.eia.camelracing.race.dto;

import com.eia.camelracing.race.entity.RaceStatus;

import jakarta.validation.constraints.NotNull;

public record RaceStatusRequest(
        @NotNull(message = "Race status is required")
        RaceStatus status
) {
}