package com.eia.camelracing.result.dto;

import java.util.UUID;

import com.eia.camelracing.result.entity.ResultStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record RaceResultRequest(
        @NotNull(message = "Registration id is required") UUID registrationId,

        @Positive(message = "Final position must be positive") Integer finalPosition,

        @PositiveOrZero(message = "Completion time must be zero or positive") Long completionTimeSeconds,

        @PositiveOrZero(message = "Penalty time must be zero or positive") Long penaltyTimeSeconds,

        @NotNull(message = "Result status is required") ResultStatus status,

        @Size(max = 1000, message = "Notes must not exceed 1000 characters") String notes) {
}