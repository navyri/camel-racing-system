package com.eia.camelracing.team.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.team.dto.TeamRequest;
import com.eia.camelracing.team.dto.TeamResponse;
import com.eia.camelracing.team.dto.TeamSummaryResponse;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamMember;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.mapper.TeamMapper;
import com.eia.camelracing.team.repository.TeamMemberRepository;
import com.eia.camelracing.team.repository.TeamRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeamService {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 100;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "name",
            "createdAt",
            "victories",
            "defeats"
    );

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final CompetitorRepository competitorRepository;

    @Value("${app.teams.max-members}")
    private int maxMembers;

    @Transactional
    public TeamResponse createTeam(TeamRequest request) {
        validateTeamNameAvailable(request.name(), null);

        Team team = TeamMapper.toEntity(request);
        team.setCreatedAt(LocalDateTime.now());
        team.setVictories(0);
        team.setDefeats(0);

        Team savedTeam = teamRepository.save(team);

        return TeamMapper.toResponse(savedTeam, List.of());
    }

    @Transactional(readOnly = true)
    public PageResponse<TeamSummaryResponse> getTeams(
            TeamStatus status,
            String search,
            Integer page,
            Integer size,
            String sort
    ) {
        Pageable pageable = buildPageable(page, size, sort);

        Page<TeamSummaryResponse> teams = teamRepository.findAllByFilters(
                status,
                normalizeFilter(search),
                pageable
        ).map(TeamMapper::toSummaryResponse);

        return PageResponse.from(teams);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(UUID id) {
        Team team = findTeamById(id);
        List<TeamMember> activeMembers = teamMemberRepository
                .findByTeamIdAndActiveTrueOrderByJoinedAtAsc(id);

        return TeamMapper.toResponse(team, activeMembers);
    }

    @Transactional
    public TeamResponse updateTeam(UUID id, TeamRequest request) {
        Team team = findTeamById(id);
        validateTeamNameAvailable(request.name(), id);

        TeamMapper.updateEntity(team, request);

        Team savedTeam = teamRepository.save(team);
        List<TeamMember> activeMembers = teamMemberRepository
                .findByTeamIdAndActiveTrueOrderByJoinedAtAsc(id);

        return TeamMapper.toResponse(savedTeam, activeMembers);
    }

    @Transactional
    public void deactivateTeam(UUID id) {
        Team team = findTeamById(id);

        if (team.getStatus() == TeamStatus.INACTIVE) {
            return;
        }

        team.setStatus(TeamStatus.INACTIVE);
        teamRepository.save(team);
    }

    @Transactional
    public TeamResponse addMember(UUID teamId, UUID competitorId) {
        Team team = findTeamById(teamId);
        Competitor competitor = findCompetitorById(competitorId);

        validateTeamCanReceiveMembers(team);
        validateCompetitorCanJoinTeam(teamId, competitorId, competitor);
        validateTeamCapacity(teamId);

        TeamMember member = TeamMember.builder()
                .team(team)
                .competitor(competitor)
                .joinedAt(LocalDateTime.now())
                .active(true)
                .build();

        teamMemberRepository.save(member);

        List<TeamMember> activeMembers = teamMemberRepository
                .findByTeamIdAndActiveTrueOrderByJoinedAtAsc(teamId);

        return TeamMapper.toResponse(team, activeMembers);
    }

    @Transactional
    public void removeMember(UUID teamId, UUID competitorId) {
        findTeamById(teamId);

        TeamMember member = teamMemberRepository
                .findByTeamIdAndCompetitorIdAndActiveTrue(teamId, competitorId)
                .orElseThrow(() -> new NoSuchElementException(
                        "Active team member was not found"
                ));

        member.setActive(false);
        member.setLeftAt(LocalDateTime.now());

        teamMemberRepository.save(member);
    }

    private Team findTeamById(UUID id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Team with id " + id + " was not found"
                ));
    }

    private Competitor findCompetitorById(UUID id) {
        return competitorRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Competitor with id " + id + " was not found"
                ));
    }

    private void validateTeamNameAvailable(String name, UUID teamId) {
        teamRepository.findByNameIgnoreCase(name)
                .filter(existingTeam -> teamId == null
                        || !teamId.equals(existingTeam.getId()))
                .ifPresent(existingTeam -> {
                    throw new ConflictException("Team name is already in use");
                });
    }

    private void validateTeamCanReceiveMembers(Team team) {
        if (team.getStatus() != TeamStatus.ACTIVE) {
            throw new ConflictException("Only active teams can receive members");
        }
    }

    private void validateCompetitorCanJoinTeam(
            UUID teamId,
            UUID competitorId,
            Competitor competitor
    ) {
        if (competitor.getStatus() != CompetitorStatus.ACTIVE) {
            throw new ConflictException("Only active competitors can join a team");
        }

        if (teamMemberRepository.existsByTeamIdAndCompetitorId(teamId, competitorId)) {
            throw new ConflictException("Competitor has already belonged to this team");
        }

        if (teamMemberRepository.existsByCompetitorIdAndActiveTrue(competitorId)) {
            throw new ConflictException("Competitor already belongs to an active team");
        }
    }

    private void validateTeamCapacity(UUID teamId) {
        long activeMembers = teamMemberRepository.countByTeamIdAndActiveTrue(teamId);

        if (activeMembers >= maxMembers) {
            throw new ConflictException("Team has reached the maximum number of members");
        }
    }

    private Pageable buildPageable(Integer page, Integer size, String sort) {
        int resolvedPage = page == null ? DEFAULT_PAGE : page;
        int resolvedSize = size == null ? DEFAULT_SIZE : size;

        if (resolvedPage < 0) {
            throw new IllegalArgumentException("Page must be zero or greater");
        }

        if (resolvedSize < 1 || resolvedSize > MAX_SIZE) {
            throw new IllegalArgumentException("Size must be between 1 and " + MAX_SIZE);
        }

        return PageRequest.of(resolvedPage, resolvedSize, buildSort(sort));
    }

    private Sort buildSort(String sort) {
        String resolvedSort = sort == null || sort.isBlank() ? "name,asc" : sort.trim();
        String[] parts = resolvedSort.split(",", -1);

        if (parts.length != 2) {
            throw new IllegalArgumentException("Sort must use the format field,direction");
        }

        String field = parts[0].trim();
        String direction = parts[1].trim();

        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new IllegalArgumentException("Sort field is not allowed");
        }

        if ("asc".equalsIgnoreCase(direction)) {
            return Sort.by(field).ascending();
        }

        if ("desc".equalsIgnoreCase(direction)) {
            return Sort.by(field).descending();
        }

        throw new IllegalArgumentException("Sort direction must be asc or desc");
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}