package com.eia.camelracing.standing.dto;

import java.util.List;

public record StandingsResponse(
        List<CompetitorStandingResponse> competitors,
        List<TeamStandingResponse> teams) {
}
