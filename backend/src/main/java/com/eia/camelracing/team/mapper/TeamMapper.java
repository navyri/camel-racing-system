package com.eia.camelracing.team.mapper;

import java.util.List;

import com.eia.camelracing.team.dto.TeamMemberResponse;
import com.eia.camelracing.team.dto.TeamRequest;
import com.eia.camelracing.team.dto.TeamResponse;
import com.eia.camelracing.team.dto.TeamSummaryResponse;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamMember;
import com.eia.camelracing.team.entity.TeamStatus;

public final class TeamMapper {

    private TeamMapper() {
    }

    public static Team toEntity(TeamRequest request) {
        if (request == null) {
            return null;
        }

        return Team.builder()
                .name(request.name())
                .description(request.description())
                .coachName(request.coachName())
                .status(TeamStatus.ACTIVE)
                .build();
    }

    public static void updateEntity(Team team, TeamRequest request) {
        team.setName(request.name());
        team.setDescription(request.description());
        team.setCoachName(request.coachName());
    }

    public static TeamSummaryResponse toSummaryResponse(Team team) {
        if (team == null) {
            return null;
        }

        return new TeamSummaryResponse(
                team.getId(),
                team.getName(),
                team.getDescription(),
                team.getCoachName(),
                team.getStatus(),
                team.getCreatedAt(),
                team.getVictories(),
                team.getDefeats()
        );
    }

    public static TeamResponse toResponse(Team team, List<TeamMember> activeMembers) {
        if (team == null) {
            return null;
        }

        List<TeamMemberResponse> members = activeMembers.stream()
                .map(TeamMapper::toMemberResponse)
                .toList();

        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getDescription(),
                team.getCoachName(),
                team.getStatus(),
                team.getCreatedAt(),
                team.getVictories(),
                team.getDefeats(),
                members
        );
    }

    public static TeamMemberResponse toMemberResponse(TeamMember member) {
        if (member == null) {
            return null;
        }

        return new TeamMemberResponse(
                member.getCompetitor().getId(),
                member.getCompetitor().getName(),
                member.getCompetitor().getNickname(),
                member.getCompetitor().getCompetitorType(),
                member.getJoinedAt()
        );
    }
}