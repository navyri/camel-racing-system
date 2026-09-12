package com.eia.camelracing.standing.dto;

import java.util.UUID;

public record CompetitorStandingResponse(
        UUID competitorId,
        String name,
        String nickname,
        int points) {
}
