package com.eia.camelracing.standing.service;

import java.util.List;

import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.result.repository.RaceResultRepository;
import com.eia.camelracing.standing.dto.CompetitorStandingResponse;
import com.eia.camelracing.standing.dto.StandingsResponse;
import com.eia.camelracing.standing.dto.TeamStandingResponse;
import com.eia.camelracing.standing.projection.CompetitorStandingProjection;
import com.eia.camelracing.standing.projection.TeamStandingProjection;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StandingService {

    private final RaceResultRepository raceResultRepository;

    @Transactional(readOnly = true)
    public StandingsResponse getStandings() {
        return new StandingsResponse(
                getCompetitorStandings(),
                getTeamStandings());
    }

    @Transactional(readOnly = true)
    public List<CompetitorStandingResponse> getCompetitorStandings() {
        return raceResultRepository.findCompetitorStandings(ResultStatus.FINISHED)
                .stream()
                .map(this::toCompetitorResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamStandingResponse> getTeamStandings() {
        return raceResultRepository.findTeamStandings(ResultStatus.FINISHED)
                .stream()
                .map(this::toTeamResponse)
                .toList();
    }

    private CompetitorStandingResponse toCompetitorResponse(
            CompetitorStandingProjection projection) {
        return new CompetitorStandingResponse(
                projection.competitorId(),
                projection.name(),
                projection.nickname(),
                Math.toIntExact(projection.points()));
    }

    private TeamStandingResponse toTeamResponse(
            TeamStandingProjection projection) {
        return new TeamStandingResponse(
                projection.teamId(),
                projection.name(),
                Math.toIntExact(projection.points()));
    }
}
