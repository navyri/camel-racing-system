package com.eia.camelracing.standing.projection;

import java.util.UUID;

public record TeamStandingProjection(
        UUID teamId,
        String name,
        long points) {
}
