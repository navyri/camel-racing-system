package com.eia.camelracing.registration.dto;

import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Positive;

public record RaceRegistrationRequest(
        UUID competitorId,

        UUID teamId,

        @Positive(message = "Starting position must be positive")
        Integer startingPosition
) {

    @AssertTrue(message = "Provide exactly one of competitorId or teamId")
    public boolean hasExactlyOneParticipant() {
        return (competitorId == null) != (teamId == null);
    }
}