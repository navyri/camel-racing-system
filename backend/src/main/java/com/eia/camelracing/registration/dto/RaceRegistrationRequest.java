package com.eia.camelracing.registration.dto;

import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;

public record RaceRegistrationRequest(
        UUID competitorId,

        UUID teamId,

        Integer startingPosition) {

    @AssertTrue(message = "Provide exactly one of competitorId or teamId")
    public boolean hasExactlyOneParticipant() {
        return (competitorId == null) != (teamId == null);
    }
}