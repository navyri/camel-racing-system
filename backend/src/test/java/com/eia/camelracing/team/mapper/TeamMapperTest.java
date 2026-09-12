package com.eia.camelracing.team.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.team.dto.TeamRequest;
import com.eia.camelracing.team.dto.TeamResponse;
import com.eia.camelracing.team.dto.TeamSummaryResponse;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamMember;
import com.eia.camelracing.team.entity.TeamStatus;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Team mapper")
class TeamMapperTest {

    @Test
    @DisplayName("maps request to active team entity")
    void mapsRequestToActiveTeamEntity() {
        Team team = TeamMapper.toEntity(request());

        assertThat(team.getId()).isNull();
        assertThat(team.getName()).isEqualTo("The Five Exceptions");
        assertThat(team.getDescription()).isEqualTo("A team of resilient dwarfs");
        assertThat(team.getCoachName()).isEqualTo("Captain Cache");
        assertThat(team.getStatus()).isEqualTo(TeamStatus.ACTIVE);
    }

    @Test
    @DisplayName("updates editable fields without changing controlled fields")
    void updatesEditableFieldsWithoutChangingControlledFields() {
        UUID id = UUID.randomUUID();
        LocalDateTime createdAt = LocalDateTime.now().minusDays(3);

        Team team = Team.builder()
                .id(id)
                .name("Old Name")
                .description("Old Description")
                .coachName("Old Coach")
                .status(TeamStatus.SUSPENDED)
                .createdAt(createdAt)
                .victories(4)
                .defeats(2)
                .build();

        TeamMapper.updateEntity(team, request());

        assertThat(team.getId()).isEqualTo(id);
        assertThat(team.getStatus()).isEqualTo(TeamStatus.SUSPENDED);
        assertThat(team.getCreatedAt()).isEqualTo(createdAt);
        assertThat(team.getVictories()).isEqualTo(4);
        assertThat(team.getDefeats()).isEqualTo(2);
        assertThat(team.getName()).isEqualTo("The Five Exceptions");
        assertThat(team.getDescription()).isEqualTo("A team of resilient dwarfs");
        assertThat(team.getCoachName()).isEqualTo("Captain Cache");
    }

    @Test
    @DisplayName("maps team to summary response")
    void mapsTeamToSummaryResponse() {
        Team team = team();

        TeamSummaryResponse response = TeamMapper.toSummaryResponse(team);

        assertThat(response.id()).isEqualTo(team.getId());
        assertThat(response.name()).isEqualTo("The Five Exceptions");
        assertThat(response.status()).isEqualTo(TeamStatus.ACTIVE);
        assertThat(response.victories()).isEqualTo(2);
        assertThat(response.defeats()).isEqualTo(1);
    }

    @Test
    @DisplayName("maps active members to flat team detail response")
    void mapsActiveMembersToFlatTeamDetailResponse() {
        Team team = team();
        LocalDateTime joinedAt = LocalDateTime.now().minusDays(1);

        Competitor competitor = Competitor.builder()
                .id(UUID.randomUUID())
                .name("Tiny Docker")
                .nickname("TinyDocker")
                .competitorType(CompetitorType.DWARF)
                .build();

        TeamMember member = TeamMember.builder()
                .id(UUID.randomUUID())
                .team(team)
                .competitor(competitor)
                .joinedAt(joinedAt)
                .active(true)
                .build();

        TeamResponse response = TeamMapper.toResponse(team, List.of(member));

        assertThat(response.members()).hasSize(1);
        assertThat(response.members().getFirst().competitorId()).isEqualTo(competitor.getId());
        assertThat(response.members().getFirst().name()).isEqualTo("Tiny Docker");
        assertThat(response.members().getFirst().nickname()).isEqualTo("TinyDocker");
        assertThat(response.members().getFirst().competitorType()).isEqualTo(CompetitorType.DWARF);
        assertThat(response.members().getFirst().joinedAt()).isEqualTo(joinedAt);
    }

    @Test
    @DisplayName("returns null for null entity inputs")
    void returnsNullForNullEntityInputs() {
        assertThat(TeamMapper.toEntity(null)).isNull();
        assertThat(TeamMapper.toSummaryResponse(null)).isNull();
        assertThat(TeamMapper.toResponse(null, List.of())).isNull();
        assertThat(TeamMapper.toMemberResponse(null)).isNull();
    }

    private TeamRequest request() {
        return new TeamRequest(
                "The Five Exceptions",
                "A team of resilient dwarfs",
                "Captain Cache"
        );
    }

    private Team team() {
        return Team.builder()
                .id(UUID.randomUUID())
                .name("The Five Exceptions")
                .description("A team of resilient dwarfs")
                .coachName("Captain Cache")
                .status(TeamStatus.ACTIVE)
                .createdAt(LocalDateTime.now().minusDays(2))
                .victories(2)
                .defeats(1)
                .build();
    }
}