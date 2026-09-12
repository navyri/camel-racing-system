package com.eia.camelracing.standing.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.result.repository.RaceResultRepository;
import com.eia.camelracing.standing.dto.CompetitorStandingResponse;
import com.eia.camelracing.standing.dto.StandingsResponse;
import com.eia.camelracing.standing.dto.TeamStandingResponse;
import com.eia.camelracing.standing.projection.CompetitorStandingProjection;
import com.eia.camelracing.standing.projection.TeamStandingProjection;

import org.junit.jupiter.api.Test;

class StandingServiceTest {

    @Test
    void shouldReturnCompetitorStandingsUsingFinishedStatus() {
        RaceResultRepository raceResultRepository = mock(RaceResultRepository.class);
        StandingService standingService = new StandingService(raceResultRepository);

        UUID competitorId = UUID.randomUUID();

        when(raceResultRepository.findCompetitorStandings(ResultStatus.FINISHED))
                .thenReturn(List.of(
                        new CompetitorStandingProjection(
                                competitorId,
                                "Desert Star",
                                "desert-star",
                                17L)));

        List<CompetitorStandingResponse> standings = standingService.getCompetitorStandings();

        assertThat(standings).containsExactly(
                new CompetitorStandingResponse(
                        competitorId,
                        "Desert Star",
                        "desert-star",
                        17));

        verify(raceResultRepository).findCompetitorStandings(ResultStatus.FINISHED);
    }

    @Test
    void shouldReturnTeamStandingsUsingFinishedStatus() {
        RaceResultRepository raceResultRepository = mock(RaceResultRepository.class);
        StandingService standingService = new StandingService(raceResultRepository);

        UUID teamId = UUID.randomUUID();

        when(raceResultRepository.findTeamStandings(ResultStatus.FINISHED))
                .thenReturn(List.of(
                        new TeamStandingProjection(
                                teamId,
                                "Sand Riders",
                                15L)));

        List<TeamStandingResponse> standings = standingService.getTeamStandings();

        assertThat(standings).containsExactly(
                new TeamStandingResponse(
                        teamId,
                        "Sand Riders",
                        15));

        verify(raceResultRepository).findTeamStandings(ResultStatus.FINISHED);
    }

    @Test
    void shouldComposeCompetitorAndTeamStandings() {
        RaceResultRepository raceResultRepository = mock(RaceResultRepository.class);
        StandingService standingService = new StandingService(raceResultRepository);

        UUID competitorId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();

        when(raceResultRepository.findCompetitorStandings(ResultStatus.FINISHED))
                .thenReturn(List.of(
                        new CompetitorStandingProjection(
                                competitorId,
                                "Desert Star",
                                "desert-star",
                                10L)));

        when(raceResultRepository.findTeamStandings(ResultStatus.FINISHED))
                .thenReturn(List.of(
                        new TeamStandingProjection(
                                teamId,
                                "Sand Riders",
                                7L)));

        StandingsResponse standings = standingService.getStandings();

        assertThat(standings.competitors()).containsExactly(
                new CompetitorStandingResponse(
                        competitorId,
                        "Desert Star",
                        "desert-star",
                        10));

        assertThat(standings.teams()).containsExactly(
                new TeamStandingResponse(
                        teamId,
                        "Sand Riders",
                        7));

        verify(raceResultRepository).findCompetitorStandings(ResultStatus.FINISHED);
        verify(raceResultRepository).findTeamStandings(ResultStatus.FINISHED);
    }

    @Test
    void shouldKeepEmptyStandingsEmpty() {
        RaceResultRepository raceResultRepository = mock(RaceResultRepository.class);
        StandingService standingService = new StandingService(raceResultRepository);

        when(raceResultRepository.findCompetitorStandings(ResultStatus.FINISHED))
                .thenReturn(List.of());

        when(raceResultRepository.findTeamStandings(ResultStatus.FINISHED))
                .thenReturn(List.of());

        StandingsResponse standings = standingService.getStandings();

        assertThat(standings.competitors()).isEmpty();
        assertThat(standings.teams()).isEmpty();

        verify(raceResultRepository).findCompetitorStandings(ResultStatus.FINISHED);
        verify(raceResultRepository).findTeamStandings(ResultStatus.FINISHED);
    }

    @Test
    void shouldConvertLongPointsToInt() {
        RaceResultRepository raceResultRepository = mock(RaceResultRepository.class);
        StandingService standingService = new StandingService(raceResultRepository);

        UUID competitorId = UUID.randomUUID();

        when(raceResultRepository.findCompetitorStandings(ResultStatus.FINISHED))
                .thenReturn(List.of(
                        new CompetitorStandingProjection(
                                competitorId,
                                "Long Points",
                                "long-points",
                                Integer.MAX_VALUE)));

        List<CompetitorStandingResponse> standings = standingService.getCompetitorStandings();

        assertThat(standings)
                .extracting(CompetitorStandingResponse::points)
                .containsExactly(Integer.MAX_VALUE);
    }

    @Test
    void shouldThrowArithmeticExceptionWhenPointsExceedIntRange() {
        RaceResultRepository raceResultRepository = mock(RaceResultRepository.class);
        StandingService standingService = new StandingService(raceResultRepository);

        when(raceResultRepository.findCompetitorStandings(ResultStatus.FINISHED))
                .thenReturn(List.of(
                        new CompetitorStandingProjection(
                                UUID.randomUUID(),
                                "Overflow",
                                "overflow",
                                (long) Integer.MAX_VALUE + 1L)));

        assertThatThrownBy(standingService::getCompetitorStandings)
                .isInstanceOf(ArithmeticException.class);

        verify(raceResultRepository).findCompetitorStandings(ResultStatus.FINISHED);
    }

    @Test
    void shouldHaveOnlyRaceResultRepositoryDependency() {
        assertThat(StandingService.class.getDeclaredFields())
                .hasSize(1)
                .allSatisfy(field -> assertThat(field.getType())
                        .isEqualTo(RaceResultRepository.class));
    }
}