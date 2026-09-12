package com.eia.camelracing.team.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.CompetitorType;

public record TeamMemberResponse(
        UUID competitorId,
        String name,
        String nickname,
        CompetitorType competitorType,
        LocalDateTime joinedAt
) {
}