package com.eia.camelracing.standing.dto;

import java.util.UUID;

public record TeamStandingResponse(
        UUID teamId,
        String name,
        int points) {
}
