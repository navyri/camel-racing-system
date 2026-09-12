package com.eia.camelracing.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.common.service.CurrentUserService;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.race.repository.RaceRepository;
import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.repository.RaceRegistrationRepository;
import com.eia.camelracing.result.dto.RaceResultRequest;
import com.eia.camelracing.result.dto.RaceResultResponse;
import com.eia.camelracing.result.dto.RaceResultUpdateRequest;
import com.eia.camelracing.result.entity.RaceResult;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.result.repository.RaceResultRepository;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.repository.TeamRepository;
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@DisplayName("Race result service")
class RaceResultServiceTest {

        private static final int WINNER_POSITION = 1;
        private static final int SECOND_POSITION = 2;

        private static final List<ResultStatus> COMPLETED_RACE_STATUSES = List.of(
                        ResultStatus.FINISHED,
                        ResultStatus.DID_NOT_FINISH,
                        ResultStatus.DISQUALIFIED);

        @Mock
        private RaceResultRepository resultRepository;

        @Mock
        private RaceRegistrationRepository registrationRepository;

        @Mock
        private RaceRepository raceRepository;

        @Mock
        private CompetitorRepository competitorRepository;

        @Mock
        private TeamRepository teamRepository;

        @Mock
        private CurrentUserService currentUserService;

        @Mock
        private AuditLogService auditLogService;

        @InjectMocks
        private RaceResultService resultService;

        @AfterEach
        void clearSecurityContext() {
                SecurityContextHolder.clearContext();
        }

        @Test
        @DisplayName("creates finished result for approved individual registration")
        void createsFinishedResultForApprovedIndividualRegistration() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Competitor competitor = competitor(competitorId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor,
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatus(
                                raceId,
                                WINNER_POSITION,
                                ResultStatus.FINISHED)).thenReturn(false);
                when(resultRepository.save(any(RaceResult.class))).thenAnswer(invocation -> {
                        RaceResult result = invocation.getArgument(0);
                        result.setId(UUID.randomUUID());
                        return result;
                });
                when(resultRepository.countByCompetitorIdAndStatusIn(
                                competitorId,
                                COMPLETED_RACE_STATUSES)).thenReturn(1L);
                when(resultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                                competitorId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(1L);
                when(resultRepository.countDefeatsByCompetitorId(
                                competitorId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(0L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                187L,
                                                3L,
                                                ResultStatus.FINISHED,
                                                "Clean finish"));

                ArgumentCaptor<RaceResult> resultCaptor = ArgumentCaptor.forClass(RaceResult.class);
                verify(resultRepository).save(resultCaptor.capture());

                RaceResult savedResult = resultCaptor.getValue();

                assertThat(response.id()).isNotNull();
                assertThat(response.raceId()).isEqualTo(raceId);
                assertThat(response.registrationId()).isEqualTo(registrationId);
                assertThat(response.competitorId()).isEqualTo(competitorId);
                assertThat(response.teamId()).isNull();
                assertThat(response.startingPosition()).isEqualTo(1);
                assertThat(response.finalPosition()).isEqualTo(WINNER_POSITION);
                assertThat(response.completionTimeSeconds()).isEqualTo(187L);
                assertThat(response.penaltyTimeSeconds()).isEqualTo(3L);
                assertThat(response.status()).isEqualTo(ResultStatus.FINISHED);
                assertThat(response.recordedByUserId()).isEqualTo(organizer.getId());

                assertThat(savedResult.getRegistration()).isEqualTo(registration);
                assertThat(savedResult.getStartingPosition()).isEqualTo(1);
                assertThat(savedResult.getFinalPosition()).isEqualTo(WINNER_POSITION);
                assertThat(savedResult.getCompletionTime()).isEqualTo(Duration.ofSeconds(187));
                assertThat(savedResult.getPenaltyTime()).isEqualTo(Duration.ofSeconds(3));
                assertThat(savedResult.getStatus()).isEqualTo(ResultStatus.FINISHED);
                assertThat(savedResult.getRecordedBy()).isEqualTo(organizer);
                assertThat(savedResult.getRecordedAt()).isNotNull();

                assertThat(competitor.getCompletedRaces()).isEqualTo(1);
                assertThat(competitor.getVictories()).isEqualTo(1);
                assertThat(competitor.getDefeats()).isZero();

                verify(competitorRepository).save(competitor);
        }

        @Test
        @DisplayName("creates finished winner result for approved team registration")
        void createsFinishedWinnerResultForApprovedTeamRegistration() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Team team = team(teamId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                null,
                                team,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);

                configureCreateTeamResult(
                                raceId,
                                registrationId,
                                team,
                                registration,
                                organizer,
                                WINNER_POSITION,
                                ResultStatus.FINISHED,
                                1L,
                                0L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                "Team victory"));

                assertThat(response.id()).isNotNull();
                assertThat(response.raceId()).isEqualTo(raceId);
                assertThat(response.registrationId()).isEqualTo(registrationId);
                assertThat(response.competitorId()).isNull();
                assertThat(response.competitorName()).isNull();
                assertThat(response.competitorNickname()).isNull();
                assertThat(response.teamId()).isEqualTo(teamId);
                assertThat(response.teamName()).isEqualTo(team.getName());
                assertThat(response.finalPosition()).isEqualTo(WINNER_POSITION);
                assertThat(response.status()).isEqualTo(ResultStatus.FINISHED);

                assertThat(team.getVictories()).isEqualTo(1);
                assertThat(team.getDefeats()).isZero();

                verifyTeamStatisticsSaved(team);
        }

        @Test
        @DisplayName("creates finished non-winner result and recalculates team defeat")
        void createsFinishedNonWinnerResultAndRecalculatesTeamDefeat() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Team team = team(teamId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                null,
                                team,
                                RegistrationStatus.APPROVED,
                                2,
                                organizer);

                configureCreateTeamResult(
                                raceId,
                                registrationId,
                                team,
                                registration,
                                organizer,
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                0L,
                                1L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                SECOND_POSITION,
                                                201L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                "Team second place"));

                assertThat(response.teamId()).isEqualTo(teamId);
                assertThat(response.finalPosition()).isEqualTo(SECOND_POSITION);
                assertThat(response.status()).isEqualTo(ResultStatus.FINISHED);

                assertThat(team.getVictories()).isZero();
                assertThat(team.getDefeats()).isEqualTo(1);

                verifyTeamStatisticsSaved(team);
        }

        @Test
        @DisplayName("creates did not finish result and recalculates team defeat")
        void createsDidNotFinishResultAndRecalculatesTeamDefeat() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Team team = team(teamId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                null,
                                team,
                                RegistrationStatus.APPROVED,
                                2,
                                organizer);

                configureCreateTeamResult(
                                raceId,
                                registrationId,
                                team,
                                registration,
                                organizer,
                                null,
                                ResultStatus.DID_NOT_FINISH,
                                0L,
                                1L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                99,
                                                500L,
                                                10L,
                                                ResultStatus.DID_NOT_FINISH,
                                                "Team did not finish"));

                assertThat(response.teamId()).isEqualTo(teamId);
                assertThat(response.finalPosition()).isNull();
                assertThat(response.completionTimeSeconds()).isZero();
                assertThat(response.penaltyTimeSeconds()).isZero();
                assertThat(response.status()).isEqualTo(ResultStatus.DID_NOT_FINISH);

                assertThat(team.getVictories()).isZero();
                assertThat(team.getDefeats()).isEqualTo(1);

                verifyTeamStatisticsSaved(team);
        }

        @Test
        @DisplayName("creates disqualified result and recalculates team defeat")
        void createsDisqualifiedResultAndRecalculatesTeamDefeat() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Team team = team(teamId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                null,
                                team,
                                RegistrationStatus.APPROVED,
                                2,
                                organizer);

                configureCreateTeamResult(
                                raceId,
                                registrationId,
                                team,
                                registration,
                                organizer,
                                null,
                                ResultStatus.DISQUALIFIED,
                                0L,
                                1L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                99,
                                                500L,
                                                10L,
                                                ResultStatus.DISQUALIFIED,
                                                "Team disqualified"));

                assertThat(response.teamId()).isEqualTo(teamId);
                assertThat(response.finalPosition()).isNull();
                assertThat(response.completionTimeSeconds()).isZero();
                assertThat(response.penaltyTimeSeconds()).isZero();
                assertThat(response.status()).isEqualTo(ResultStatus.DISQUALIFIED);

                assertThat(team.getVictories()).isZero();
                assertThat(team.getDefeats()).isEqualTo(1);

                verifyTeamStatisticsSaved(team);
        }

        @Test
        @DisplayName("creates did not start result without changing team statistics")
        void createsDidNotStartResultWithoutChangingTeamStatistics() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Team team = team(teamId);
                team.setVictories(4);
                team.setDefeats(3);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                null,
                                team,
                                RegistrationStatus.APPROVED,
                                2,
                                organizer);

                configureCreateTeamResult(
                                raceId,
                                registrationId,
                                team,
                                registration,
                                organizer,
                                null,
                                ResultStatus.DID_NOT_START,
                                4L,
                                3L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                500L,
                                                10L,
                                                ResultStatus.DID_NOT_START,
                                                "Team did not start"));

                assertThat(response.teamId()).isEqualTo(teamId);
                assertThat(response.finalPosition()).isNull();
                assertThat(response.completionTimeSeconds()).isZero();
                assertThat(response.penaltyTimeSeconds()).isZero();
                assertThat(response.status()).isEqualTo(ResultStatus.DID_NOT_START);

                assertThat(team.getVictories()).isEqualTo(4);
                assertThat(team.getDefeats()).isEqualTo(3);

                verifyTeamStatisticsSaved(team);
        }

        @Test
        @DisplayName("updates team result and replaces statistics with recalculated values")
        void updatesTeamResultAndReplacesStatisticsWithRecalculatedValues() {
                UUID resultId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Team team = team(teamId);
                team.setVictories(3);
                team.setDefeats(1);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                null,
                                team,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);
                RaceResult result = RaceResult.builder()
                                .id(resultId)
                                .registration(registration)
                                .startingPosition(1)
                                .finalPosition(WINNER_POSITION)
                                .completionTime(Duration.ofSeconds(187))
                                .penaltyTime(Duration.ZERO)
                                .status(ResultStatus.FINISHED)
                                .notes("Initial team result")
                                .recordedBy(organizer)
                                .recordedAt(LocalDateTime.now().minusMinutes(5))
                                .build();

                authenticateOrganizer();

                when(resultRepository.findDetailedById(resultId)).thenReturn(Optional.of(result));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatusAndIdNot(
                                raceId,
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                resultId)).thenReturn(false);
                when(resultRepository.save(result)).thenReturn(result);
                when(resultRepository.countVictoriesByTeamId(
                                teamId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(2L);
                when(resultRepository.countDefeatsByTeamId(
                                teamId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(4L);

                RaceResultResponse response = resultService.updateResult(
                                resultId,
                                new RaceResultUpdateRequest(
                                                SECOND_POSITION,
                                                205L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                "Corrected team result"));

                assertThat(response.registrationId()).isEqualTo(registrationId);
                assertThat(response.competitorId()).isNull();
                assertThat(response.teamId()).isEqualTo(teamId);
                assertThat(response.finalPosition()).isEqualTo(SECOND_POSITION);
                assertThat(response.completionTimeSeconds()).isEqualTo(205L);
                assertThat(response.status()).isEqualTo(ResultStatus.FINISHED);
                assertThat(response.notes()).isEqualTo("Corrected team result");

                assertThat(team.getVictories()).isEqualTo(2);
                assertThat(team.getDefeats()).isEqualTo(4);

                verify(teamRepository).save(team);
                verify(competitorRepository, never()).save(any(Competitor.class));
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RESULT_UPDATED),
                                eq("RESULT"),
                                eq(resultId.toString()),
                                eq("Race result updated"),
                                eq(
                                                "finalPosition=1, completionTimeSeconds=187, penaltyTimeSeconds=0, "
                                                                + "status=FINISHED, notes=Initial team result"),
                                eq(
                                                "finalPosition=2, completionTimeSeconds=205, penaltyTimeSeconds=0, "
                                                                + "status=FINISHED, notes=Corrected team result"));
        }

        @Test
        @DisplayName("rejects result when registration does not belong to requested race")
        void rejectsResultWhenRegistrationDoesNotBelongToRequestedRace() {
                UUID requestedRaceId = UUID.randomUUID();
                UUID registrationRaceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();

                User organizer = user("organizer");
                Race registrationRace = race(registrationRaceId, organizer);
                RaceRegistration registration = registration(
                                registrationId,
                                registrationRace,
                                competitor(UUID.randomUUID()),
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));

                assertThatThrownBy(() -> resultService.createResult(
                                requestedRaceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Registration does not belong to the requested race");

                verify(currentUserService, never()).getOrSynchronizeCurrentUser();
                verify(resultRepository, never()).save(any(RaceResult.class));
        }

        @Test
        @DisplayName("rejects result when race is not in progress")
        void rejectsResultWhenRaceIsNotInProgress() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                race.setStatus(RaceStatus.CLOSED_FOR_REGISTRATION);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor(UUID.randomUUID()),
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));

                assertThatThrownBy(() -> resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Results can only be recorded for an in-progress race");

                verify(currentUserService, never()).getOrSynchronizeCurrentUser();
                verify(resultRepository, never()).save(any(RaceResult.class));
        }

        @Test
        @DisplayName("rejects result for non-approved registration")
        void rejectsResultForNonApprovedRegistration() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor(UUID.randomUUID()),
                                null,
                                RegistrationStatus.PENDING,
                                1,
                                organizer);

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Only approved registrations can receive results");

                verify(resultRepository, never()).save(any(RaceResult.class));
        }

        @Test
        @DisplayName("rejects second official winner in the same race")
        void rejectsSecondOfficialWinnerInTheSameRace() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor(UUID.randomUUID()),
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatus(
                                raceId,
                                WINNER_POSITION,
                                ResultStatus.FINISHED)).thenReturn(true);

                assertThatThrownBy(() -> resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Final position is already assigned to another finished result");

                verify(resultRepository, never()).save(any(RaceResult.class));
        }

        @Test
        @DisplayName("normalizes non-finished result values")
        void normalizesNonFinishedResultValues() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Competitor competitor = competitor(competitorId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor,
                                null,
                                RegistrationStatus.APPROVED,
                                2,
                                organizer);

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.save(any(RaceResult.class))).thenAnswer(invocation -> {
                        RaceResult result = invocation.getArgument(0);
                        result.setId(UUID.randomUUID());
                        return result;
                });
                when(resultRepository.countByCompetitorIdAndStatusIn(
                                competitorId,
                                COMPLETED_RACE_STATUSES)).thenReturn(1L);
                when(resultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                                competitorId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(0L);
                when(resultRepository.countDefeatsByCompetitorId(
                                competitorId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(1L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                99,
                                                999L,
                                                5L,
                                                ResultStatus.DISQUALIFIED,
                                                "Rule violation"));

                assertThat(response.finalPosition()).isNull();
                assertThat(response.completionTimeSeconds()).isZero();
                assertThat(response.penaltyTimeSeconds()).isZero();
                assertThat(response.status()).isEqualTo(ResultStatus.DISQUALIFIED);

                verify(competitorRepository).save(competitor);
                assertThat(competitor.getCompletedRaces()).isEqualTo(1);
                assertThat(competitor.getVictories()).isZero();
                assertThat(competitor.getDefeats()).isEqualTo(1);
        }

        @Test
        @DisplayName("does not change statistics for did not start result")
        void doesNotChangeStatisticsForDidNotStartResult() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Competitor competitor = competitor(competitorId);
                competitor.setCompletedRaces(4);
                competitor.setVictories(1);
                competitor.setDefeats(3);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor,
                                null,
                                RegistrationStatus.APPROVED,
                                2,
                                organizer);

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.save(any(RaceResult.class))).thenAnswer(invocation -> {
                        RaceResult result = invocation.getArgument(0);
                        result.setId(UUID.randomUUID());
                        return result;
                });
                when(resultRepository.countByCompetitorIdAndStatusIn(
                                competitorId,
                                COMPLETED_RACE_STATUSES)).thenReturn(4L);
                when(resultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                                competitorId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(1L);
                when(resultRepository.countDefeatsByCompetitorId(
                                competitorId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(3L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                100L,
                                                5L,
                                                ResultStatus.DID_NOT_START,
                                                "Participant did not arrive"));

                assertThat(response.finalPosition()).isNull();
                assertThat(response.completionTimeSeconds()).isZero();
                assertThat(response.penaltyTimeSeconds()).isZero();
                assertThat(response.status()).isEqualTo(ResultStatus.DID_NOT_START);

                assertThat(competitor.getCompletedRaces()).isEqualTo(4);
                assertThat(competitor.getVictories()).isEqualTo(1);
                assertThat(competitor.getDefeats()).isEqualTo(3);
                verify(competitorRepository).save(competitor);
        }

        @Test
        @DisplayName("administrator can create result for another organizer race")
        void administratorCanCreateResultForAnotherOrganizerRace() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User ownerOrganizer = user("owner-organizer");
                User administrator = user("administrator");
                Race race = race(raceId, ownerOrganizer);
                Competitor competitor = competitor(competitorId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor,
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                ownerOrganizer);

                authenticateAdministrator();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(administrator);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatus(
                                raceId,
                                WINNER_POSITION,
                                ResultStatus.FINISHED)).thenReturn(false);
                when(resultRepository.save(any(RaceResult.class))).thenAnswer(invocation -> {
                        RaceResult result = invocation.getArgument(0);
                        result.setId(UUID.randomUUID());
                        return result;
                });
                when(resultRepository.countByCompetitorIdAndStatusIn(
                                competitorId,
                                COMPLETED_RACE_STATUSES)).thenReturn(1L);
                when(resultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                                competitorId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(1L);
                when(resultRepository.countDefeatsByCompetitorId(
                                competitorId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(0L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                180L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null));

                assertThat(response.recordedByUserId()).isEqualTo(administrator.getId());
                verify(competitorRepository).save(competitor);
        }

        @Test
        @DisplayName("rejects organizer result for another organizer race")
        void rejectsOrganizerResultForAnotherOrganizerRace() {
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();

                User ownerOrganizer = user("owner-organizer");
                User anotherOrganizer = user("another-organizer");
                Race race = race(raceId, ownerOrganizer);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor(UUID.randomUUID()),
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                ownerOrganizer);

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(anotherOrganizer);

                assertThatThrownBy(() -> resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                WINNER_POSITION,
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                                .hasMessage("Race organizer can only manage results for own races");

                verify(resultRepository, never()).save(any(RaceResult.class));
        }

        @Test
        @DisplayName("updates result without changing registration")
        void updatesResultWithoutChangingRegistration() {
                UUID resultId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID registrationId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Competitor competitor = competitor(competitorId);
                RaceRegistration registration = registration(
                                registrationId,
                                race,
                                competitor,
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);
                RaceResult result = RaceResult.builder()
                                .id(resultId)
                                .registration(registration)
                                .startingPosition(1)
                                .finalPosition(2)
                                .completionTime(Duration.ofSeconds(220))
                                .penaltyTime(Duration.ZERO)
                                .status(ResultStatus.FINISHED)
                                .notes("Initial result")
                                .recordedBy(organizer)
                                .recordedAt(LocalDateTime.now().minusMinutes(5))
                                .build();

                authenticateOrganizer();

                when(resultRepository.findDetailedById(resultId)).thenReturn(Optional.of(result));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatusAndIdNot(
                                raceId,
                                WINNER_POSITION,
                                ResultStatus.FINISHED,
                                resultId)).thenReturn(false);
                when(resultRepository.save(result)).thenReturn(result);
                when(resultRepository.countByCompetitorIdAndStatusIn(
                                competitorId,
                                COMPLETED_RACE_STATUSES)).thenReturn(1L);
                when(resultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                                competitorId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(1L);
                when(resultRepository.countDefeatsByCompetitorId(
                                competitorId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(0L);

                RaceResultResponse response = resultService.updateResult(
                                resultId,
                                new RaceResultUpdateRequest(
                                                WINNER_POSITION,
                                                190L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                "Corrected result"));

                assertThat(response.registrationId()).isEqualTo(registrationId);
                assertThat(response.finalPosition()).isEqualTo(WINNER_POSITION);
                assertThat(response.completionTimeSeconds()).isEqualTo(190L);
                assertThat(response.notes()).isEqualTo("Corrected result");
                assertThat(result.getRegistration()).isEqualTo(registration);
                assertThat(result.getStartingPosition()).isEqualTo(1);
                assertThat(result.getRecordedBy()).isEqualTo(organizer);
                assertThat(result.getStatus()).isEqualTo(ResultStatus.FINISHED);

                verify(competitorRepository).save(competitor);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RESULT_UPDATED),
                                eq("RESULT"),
                                eq(resultId.toString()),
                                eq("Race result updated"),
                                eq(
                                                "finalPosition=2, completionTimeSeconds=220, penaltyTimeSeconds=0, "
                                                                + "status=FINISHED, notes=Initial result"),
                                eq(
                                                "finalPosition=1, completionTimeSeconds=190, penaltyTimeSeconds=0, "
                                                                + "status=FINISHED, notes=Corrected result"));
        }

        private void configureCreateTeamResult(
                        UUID raceId,
                        UUID registrationId,
                        Team team,
                        RaceRegistration registration,
                        User organizer,
                        Integer finalPosition,
                        ResultStatus status,
                        long victories,
                        long defeats) {
                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.save(any(RaceResult.class))).thenAnswer(invocation -> {
                        RaceResult result = invocation.getArgument(0);
                        result.setId(UUID.randomUUID());
                        return result;
                });
                when(resultRepository.countVictoriesByTeamId(
                                team.getId(),
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(victories);
                when(resultRepository.countDefeatsByTeamId(
                                team.getId(),
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(defeats);

                if (status == ResultStatus.FINISHED) {
                        when(resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatus(
                                        raceId,
                                        finalPosition,
                                        ResultStatus.FINISHED)).thenReturn(false);
                }
        }

        private void verifyTeamStatisticsSaved(Team team) {
                verify(teamRepository).save(team);
                verify(competitorRepository, never()).save(any(Competitor.class));
        }

        private void authenticateOrganizer() {
                SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(
                                                "organizer",
                                                "password",
                                                List.of(new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))));
        }

        private void authenticateAdministrator() {
                SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(
                                                "administrator",
                                                "password",
                                                List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))));
        }

        private Race race(UUID id, User organizer) {
                return Race.builder()
                                .id(id)
                                .name("Result Test Race")
                                .description("Race used for result service tests")
                                .scheduledAt(LocalDateTime.now().plusDays(3))
                                .startLocation("Start")
                                .finishLocation("Finish")
                                .distanceMeters(new BigDecimal("1000.00"))
                                .maxParticipants(10)
                                .raceType(RaceType.MIXED)
                                .status(RaceStatus.IN_PROGRESS)
                                .organizer(organizer)
                                .registrationDeadline(LocalDateTime.now().plusDays(2))
                                .createdAt(LocalDateTime.now().minusHours(1))
                                .updatedAt(LocalDateTime.now().minusMinutes(5))
                                .build();
        }

        private RaceRegistration registration(
                        UUID id,
                        Race race,
                        Competitor competitor,
                        Team team,
                        RegistrationStatus status,
                        Integer startingPosition,
                        User registeredBy) {
                return RaceRegistration.builder()
                                .id(id)
                                .race(race)
                                .competitor(competitor)
                                .team(team)
                                .registeredAt(LocalDateTime.now().minusMinutes(20))
                                .status(status)
                                .startingPosition(startingPosition)
                                .registeredBy(registeredBy)
                                .build();
        }

        private Competitor competitor(UUID id) {
                return Competitor.builder()
                                .id(id)
                                .name("Tiny Docker")
                                .nickname("TinyDocker")
                                .competitorType(CompetitorType.DWARF)
                                .approximateAge(21)
                                .weightKg(new BigDecimal("50.00"))
                                .heightCm(new BigDecimal("120.00"))
                                .origin("Colombia")
                                .status(CompetitorStatus.ACTIVE)
                                .registrationDate(LocalDateTime.now().minusDays(1))
                                .victories(0)
                                .defeats(0)
                                .completedRaces(0)
                                .build();
        }

        private Team team(UUID id) {
                return Team.builder()
                                .id(id)
                                .name("Sand Riders")
                                .description("Team used for result service tests")
                                .coachName("Team Coach")
                                .status(TeamStatus.ACTIVE)
                                .createdAt(LocalDateTime.now().minusDays(1))
                                .victories(0)
                                .defeats(0)
                                .build();
        }

        private User user(String username) {
                return User.builder()
                                .id(UUID.randomUUID())
                                .keycloakSubject("issuer|" + username)
                                .username(username)
                                .email(username + "@camel-racing.test")
                                .firstName("Race")
                                .lastName("Organizer")
                                .enabled(true)
                                .createdAt(LocalDateTime.now().minusDays(1))
                                .build();
        }
}