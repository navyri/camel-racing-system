package com.eia.camelracing.registration.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record RegistrationApprovalRequest(
        @NotNull(message = "Starting position is required") @Positive(message = "Starting position must be positive") Integer startingPosition) {
}