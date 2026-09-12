package com.eia.camelracing.standing.projection;

import java.util.UUID;

public record CompetitorStandingProjection(
        UUID competitorId,
        String name,
        String nickname,
        long points) {
}
