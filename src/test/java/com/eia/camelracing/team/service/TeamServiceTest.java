package com.eia.camelracing.team.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.team.dto.TeamRequest;
import com.eia.camelracing.team.dto.TeamResponse;
import com.eia.camelracing.team.dto.TeamSummaryResponse;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamMember;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.repository.TeamMemberRepository;
import com.eia.camelracing.team.repository.TeamRepository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("Team service")
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private CompetitorRepository competitorRepository;

    @InjectMocks
    private TeamService teamService;

    @Test
    @DisplayName("creates an active team with initial statistics")
    void createsActiveTeamWithInitialStatistics() {
        ReflectionTestUtils.setField(teamService, "maxMembers", 5);

        when(teamRepository.findByNameIgnoreCase("The Five Exceptions"))
                .thenReturn(Optional.empty());

        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> {
            Team team = invocation.getArgument(0);
            team.setId(UUID.randomUUID());
            return team;
        });

        TeamResponse response = teamService.createTeam(request());

        ArgumentCaptor<Team> captor = ArgumentCaptor.forClass(Team.class);
        verify(teamRepository).save(captor.capture());

        Team savedTeam = captor.getValue();

        assertThat(response.id()).isNotNull();
        assertThat(savedTeam.getStatus()).isEqualTo(TeamStatus.ACTIVE);
        assertThat(savedTeam.getCreatedAt()).isNotNull();
        assertThat(savedTeam.getVictories()).isZero();
        assertThat(savedTeam.getDefeats()).isZero();
    }

    @Test
    @DisplayName("rejects duplicated team name ignoring case")
    void rejectsDuplicatedTeamNameIgnoringCase() {
        Team existingTeam = team("the five exceptions", TeamStatus.ACTIVE);

        when(teamRepository.findByNameIgnoreCase("The Five Exceptions"))
                .thenReturn(Optional.of(existingTeam));

        assertThatThrownBy(() -> teamService.createTeam(request()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Team name is already in use");
    }

    @Test
    @DisplayName("allows update when team keeps its own name")
    void allowsUpdateWhenTeamKeepsItsOwnName() {
        UUID id = UUID.randomUUID();
        Team team = team("The Five Exceptions", TeamStatus.ACTIVE);
        team.setId(id);

        when(teamRepository.findById(id)).thenReturn(Optional.of(team));
        when(teamRepository.findByNameIgnoreCase("The Five Exceptions"))
                .thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);
        when(teamMemberRepository.findByTeamIdAndActiveTrueOrderByJoinedAtAsc(id))
                .thenReturn(List.of());

        TeamResponse response = teamService.updateTeam(id, request());

        assertThat(response.name()).isEqualTo("The Five Exceptions");
        verify(teamRepository).save(team);
    }

    @Test
    @DisplayName("returns filtered paginated teams")
    void returnsFilteredPaginatedTeams() {
        Team team = team("The Five Exceptions", TeamStatus.ACTIVE);
        team.setId(UUID.randomUUID());

        PageRequest pageable = PageRequest.of(0, 10, Sort.by("name").ascending());

        when(teamRepository.findAllByFilters(
                TeamStatus.ACTIVE,
                "exceptions",
                pageable
        )).thenReturn(new PageImpl<>(List.of(team), pageable, 1));

        PageResponse<TeamSummaryResponse> response = teamService.getTeams(
                TeamStatus.ACTIVE,
                "exceptions",
                0,
                10,
                "name,asc"
        );

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().name()).isEqualTo("The Five Exceptions");
        assertThat(response.totalElements()).isEqualTo(1);
        assertThat(response.first()).isTrue();
        assertThat(response.last()).isTrue();
    }

    @Test
    @DisplayName("adds active competitor to active team")
    void addsActiveCompetitorToActiveTeam() {
        ReflectionTestUtils.setField(teamService, "maxMembers", 5);

        UUID teamId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        Team team = team("The Five Exceptions", TeamStatus.ACTIVE);
        team.setId(teamId);

        Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
        when(teamMemberRepository.existsByTeamIdAndCompetitorId(teamId, competitorId))
                .thenReturn(false);
        when(teamMemberRepository.existsByCompetitorIdAndActiveTrue(competitorId))
                .thenReturn(false);
        when(teamMemberRepository.countByTeamIdAndActiveTrue(teamId)).thenReturn(0L);
        when(teamMemberRepository.save(any(TeamMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TeamMember member = TeamMember.builder()
                .id(UUID.randomUUID())
                .team(team)
                .competitor(competitor)
                .joinedAt(LocalDateTime.now())
                .active(true)
                .build();

        when(teamMemberRepository.findByTeamIdAndActiveTrueOrderByJoinedAtAsc(teamId))
                .thenReturn(List.of(member));

        TeamResponse response = teamService.addMember(teamId, competitorId);

        assertThat(response.members()).hasSize(1);
        assertThat(response.members().getFirst().competitorId()).isEqualTo(competitorId);
        verify(teamMemberRepository).save(any(TeamMember.class));
    }

    @Test
    @DisplayName("rejects member when team reached configured maximum")
    void rejectsMemberWhenTeamReachedConfiguredMaximum() {
        ReflectionTestUtils.setField(teamService, "maxMembers", 2);

        UUID teamId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        Team team = team("The Five Exceptions", TeamStatus.ACTIVE);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(competitorRepository.findById(competitorId))
                .thenReturn(Optional.of(competitor(competitorId, CompetitorStatus.ACTIVE)));
        when(teamMemberRepository.existsByTeamIdAndCompetitorId(teamId, competitorId))
                .thenReturn(false);
        when(teamMemberRepository.existsByCompetitorIdAndActiveTrue(competitorId))
                .thenReturn(false);
        when(teamMemberRepository.countByTeamIdAndActiveTrue(teamId)).thenReturn(2L);

        assertThatThrownBy(() -> teamService.addMember(teamId, competitorId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Team has reached the maximum number of members");
    }

    @Test
    @DisplayName("rejects inactive competitor membership")
    void rejectsInactiveCompetitorMembership() {
        ReflectionTestUtils.setField(teamService, "maxMembers", 5);

        UUID teamId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        when(teamRepository.findById(teamId))
                .thenReturn(Optional.of(team("The Five Exceptions", TeamStatus.ACTIVE)));
        when(competitorRepository.findById(competitorId))
                .thenReturn(Optional.of(competitor(competitorId, CompetitorStatus.SUSPENDED)));

        assertThatThrownBy(() -> teamService.addMember(teamId, competitorId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Only active competitors can join a team");
    }

    @Test
    @DisplayName("rejects competitor already registered in active team")
    void rejectsCompetitorAlreadyRegisteredInActiveTeam() {
        ReflectionTestUtils.setField(teamService, "maxMembers", 5);

        UUID teamId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        when(teamRepository.findById(teamId))
                .thenReturn(Optional.of(team("The Five Exceptions", TeamStatus.ACTIVE)));
        when(competitorRepository.findById(competitorId))
                .thenReturn(Optional.of(competitor(competitorId, CompetitorStatus.ACTIVE)));
        when(teamMemberRepository.existsByTeamIdAndCompetitorId(teamId, competitorId))
                .thenReturn(false);
        when(teamMemberRepository.existsByCompetitorIdAndActiveTrue(competitorId))
                .thenReturn(true);

        assertThatThrownBy(() -> teamService.addMember(teamId, competitorId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Competitor already belongs to an active team");
    }

    @Test
    @DisplayName("rejects competitor that already belonged to same team")
    void rejectsCompetitorThatAlreadyBelongedToSameTeam() {
        ReflectionTestUtils.setField(teamService, "maxMembers", 5);

        UUID teamId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        when(teamRepository.findById(teamId))
                .thenReturn(Optional.of(team("The Five Exceptions", TeamStatus.ACTIVE)));
        when(competitorRepository.findById(competitorId))
                .thenReturn(Optional.of(competitor(competitorId, CompetitorStatus.ACTIVE)));
        when(teamMemberRepository.existsByTeamIdAndCompetitorId(teamId, competitorId))
                .thenReturn(true);

        assertThatThrownBy(() -> teamService.addMember(teamId, competitorId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Competitor has already belonged to this team");
    }

    @Test
    @DisplayName("removes active member logically")
    void removesActiveMemberLogically() {
        UUID teamId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        Team team = team("The Five Exceptions", TeamStatus.ACTIVE);
        Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

        TeamMember member = TeamMember.builder()
                .id(UUID.randomUUID())
                .team(team)
                .competitor(competitor)
                .joinedAt(LocalDateTime.now().minusDays(2))
                .active(true)
                .build();

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndCompetitorIdAndActiveTrue(teamId, competitorId))
                .thenReturn(Optional.of(member));
        when(teamMemberRepository.save(member)).thenReturn(member);

        teamService.removeMember(teamId, competitorId);

        assertThat(member.isActive()).isFalse();
        assertThat(member.getLeftAt()).isNotNull();
        verify(teamMemberRepository).save(member);
    }

    @Test
    @DisplayName("deactivates team without changing members")
    void deactivatesTeamWithoutChangingMembers() {
        UUID teamId = UUID.randomUUID();
        Team team = team("The Five Exceptions", TeamStatus.ACTIVE);
        team.setId(teamId);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamRepository.save(team)).thenReturn(team);

        teamService.deactivateTeam(teamId);

        assertThat(team.getStatus()).isEqualTo(TeamStatus.INACTIVE);
        verify(teamRepository).save(team);
    }

    @Test
    @DisplayName("deactivation is idempotent for inactive team")
    void deactivationIsIdempotentForInactiveTeam() {
        UUID teamId = UUID.randomUUID();
        Team team = team("The Five Exceptions", TeamStatus.INACTIVE);
        team.setId(teamId);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        teamService.deactivateTeam(teamId);

        verify(teamRepository).findById(teamId);
    }

    @Test
    @DisplayName("throws not found when team does not exist")
    void throwsNotFoundWhenTeamDoesNotExist() {
        UUID teamId = UUID.randomUUID();

        when(teamRepository.findById(teamId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> teamService.getTeamById(teamId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Team with id");
    }

    private TeamRequest request() {
        return new TeamRequest(
                "The Five Exceptions",
                "A team of resilient dwarfs",
                "Captain Cache"
        );
    }

    private Team team(String name, TeamStatus status) {
        return Team.builder()
                .id(UUID.randomUUID())
                .name(name)
                .description("A team of resilient dwarfs")
                .coachName("Captain Cache")
                .status(status)
                .createdAt(LocalDateTime.now().minusDays(2))
                .victories(0)
                .defeats(0)
                .build();
    }

    private Competitor competitor(UUID id, CompetitorStatus status) {
        return Competitor.builder()
                .id(id)
                .name("Tiny Docker")
                .nickname("TinyDocker")
                .competitorType(CompetitorType.DWARF)
                .status(status)
                .build();
    }
}