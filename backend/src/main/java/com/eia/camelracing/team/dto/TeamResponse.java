package com.eia.camelracing.team.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.team.entity.TeamStatus;

public record TeamResponse(
        UUID id,
        String name,
        String description,
        String coachName,
        TeamStatus status,
        LocalDateTime createdAt,
        int victories,
        int defeats,
        List<TeamMemberResponse> members
) {
}