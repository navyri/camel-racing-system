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
import java.util.ArrayList;
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

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@DisplayName("Race result service")
class RaceResultServiceTest {

        private static final int WINNER_POSITION = 1;
        private static final int SECOND_POSITION = 2;
        private static final int THIRD_POSITION = 3;
        private static final int FOURTH_POSITION = 4;

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
        @DisplayName("creates finished result and assigns automatic winner position")
        void createsFinishedResultAndAssignsAutomaticWinnerPosition() {
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

                RaceResult[] savedResultHolder = new RaceResult[1];

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.save(any(RaceResult.class))).thenAnswer(invocation -> {
                        RaceResult result = invocation.getArgument(0);
                        result.setId(UUID.randomUUID());
                        savedResultHolder[0] = result;
                        return result;
                });
                when(resultRepository.findDetailedFinishedByRaceId(
                                raceId,
                                ResultStatus.FINISHED))
                                .thenAnswer(invocation -> new ArrayList<>(List.of(savedResultHolder[0])));
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                configureCompetitorStatistics(competitorId, 1L, 1L, 0L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
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
                verify(resultRepository).saveAll(List.of(savedResult));
        }

        @Test
        @DisplayName("ranks finished results by time penalty recorded at and id")
        void ranksFinishedResultsByTimePenaltyRecordedAtAndId() {
                UUID raceId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);

                Competitor firstCompetitor = competitor(
                                UUID.fromString("00000000-0000-0000-0000-000000000001"));
                Competitor secondCompetitor = competitor(
                                UUID.fromString("00000000-0000-0000-0000-000000000002"));
                Competitor thirdCompetitor = competitor(
                                UUID.fromString("00000000-0000-0000-0000-000000000003"));
                Competitor fourthCompetitor = competitor(
                                UUID.fromString("00000000-0000-0000-0000-000000000004"));

                RaceResult first = finishedResult(
                                UUID.fromString("00000000-0000-0000-0000-000000000004"),
                                registration(
                                                UUID.randomUUID(),
                                                race,
                                                firstCompetitor,
                                                null,
                                                RegistrationStatus.APPROVED,
                                                1,
                                                organizer),
                                organizer,
                                187,
                                5,
                                LocalDateTime.of(2026, 9, 14, 10, 5));

                RaceResult second = finishedResult(
                                UUID.fromString("00000000-0000-0000-0000-000000000003"),
                                registration(
                                                UUID.randomUUID(),
                                                race,
                                                secondCompetitor,
                                                null,
                                                RegistrationStatus.APPROVED,
                                                2,
                                                organizer),
                                organizer,
                                187,
                                10,
                                LocalDateTime.of(2026, 9, 14, 10, 4));

                RaceResult third = finishedResult(
                                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                                registration(
                                                UUID.randomUUID(),
                                                race,
                                                thirdCompetitor,
                                                null,
                                                RegistrationStatus.APPROVED,
                                                3,
                                                organizer),
                                organizer,
                                188,
                                0,
                                LocalDateTime.of(2026, 9, 14, 10, 3));

                RaceResult fourth = finishedResult(
                                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                                registration(
                                                UUID.randomUUID(),
                                                race,
                                                fourthCompetitor,
                                                null,
                                                RegistrationStatus.APPROVED,
                                                4,
                                                organizer),
                                organizer,
                                187,
                                5,
                                LocalDateTime.of(2026, 9, 14, 10, 4));

                authenticateOrganizer();

                when(resultRepository.findDetailedById(first.getId()))
                                .thenReturn(Optional.of(first));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.save(first)).thenReturn(first);
                when(resultRepository.findDetailedFinishedByRaceId(
                                raceId,
                                ResultStatus.FINISHED)).thenReturn(
                                                new ArrayList<>(List.of(second, third, first, fourth)));

                when(competitorRepository.findById(firstCompetitor.getId()))
                                .thenReturn(Optional.of(firstCompetitor));
                when(competitorRepository.findById(secondCompetitor.getId()))
                                .thenReturn(Optional.of(secondCompetitor));
                when(competitorRepository.findById(thirdCompetitor.getId()))
                                .thenReturn(Optional.of(thirdCompetitor));
                when(competitorRepository.findById(fourthCompetitor.getId()))
                                .thenReturn(Optional.of(fourthCompetitor));

                configureCompetitorStatistics(firstCompetitor.getId(), 1L, 0L, 1L);
                configureCompetitorStatistics(secondCompetitor.getId(), 1L, 0L, 1L);
                configureCompetitorStatistics(thirdCompetitor.getId(), 1L, 0L, 1L);
                configureCompetitorStatistics(fourthCompetitor.getId(), 1L, 1L, 0L);

                RaceResultResponse response = resultService.updateResult(
                                first.getId(),
                                new RaceResultUpdateRequest(
                                                187L,
                                                5L,
                                                ResultStatus.FINISHED,
                                                "Recalculated"));

                assertThat(response.finalPosition()).isEqualTo(SECOND_POSITION);
                assertThat(fourth.getFinalPosition()).isEqualTo(WINNER_POSITION);
                assertThat(first.getFinalPosition()).isEqualTo(SECOND_POSITION);
                assertThat(second.getFinalPosition()).isEqualTo(THIRD_POSITION);
                assertThat(third.getFinalPosition()).isEqualTo(FOURTH_POSITION);

                verify(resultRepository).saveAll(List.of(fourth, first, second, third));
                verify(competitorRepository).save(firstCompetitor);
                verify(competitorRepository).save(secondCompetitor);
                verify(competitorRepository).save(thirdCompetitor);
                verify(competitorRepository).save(fourthCompetitor);
        }

        @Test
        @DisplayName("normalizes non finished result values")
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
                when(resultRepository.findDetailedFinishedByRaceId(
                                raceId,
                                ResultStatus.FINISHED)).thenReturn(new ArrayList<>());
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                configureCompetitorStatistics(competitorId, 1L, 0L, 1L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
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
                when(resultRepository.findDetailedFinishedByRaceId(
                                raceId,
                                ResultStatus.FINISHED)).thenReturn(new ArrayList<>());
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                configureCompetitorStatistics(competitorId, 4L, 1L, 3L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
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
        @DisplayName("rejects result for non approved registration")
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
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Only approved registrations can receive results");

                verify(resultRepository, never()).save(any(RaceResult.class));
        }

        @Test
        @DisplayName("rejects duplicate result for registration")
        void rejectsDuplicateResultForRegistration() {
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
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(true);

                assertThatThrownBy(() -> resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Registration already has an official result");

                verify(resultRepository, never()).save(any(RaceResult.class));
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

                RaceResult[] savedResultHolder = new RaceResult[1];

                authenticateAdministrator();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(administrator);
                when(resultRepository.existsByRegistrationId(registrationId)).thenReturn(false);
                when(resultRepository.save(any(RaceResult.class))).thenAnswer(invocation -> {
                        RaceResult result = invocation.getArgument(0);
                        result.setId(UUID.randomUUID());
                        savedResultHolder[0] = result;
                        return result;
                });
                when(resultRepository.findDetailedFinishedByRaceId(
                                raceId,
                                ResultStatus.FINISHED))
                                .thenAnswer(invocation -> new ArrayList<>(List.of(savedResultHolder[0])));
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                configureCompetitorStatistics(competitorId, 1L, 1L, 0L);

                RaceResultResponse response = resultService.createResult(
                                raceId,
                                new RaceResultRequest(
                                                registrationId,
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
                                                187L,
                                                0L,
                                                ResultStatus.FINISHED,
                                                null)))
                                .isInstanceOf(AccessDeniedException.class)
                                .hasMessage("Race organizer can only manage results for own races");

                verify(resultRepository, never()).save(any(RaceResult.class));
        }

        @Test
        @DisplayName("updates result and recalculates automatic position")
        void updatesResultAndRecalculatesAutomaticPosition() {
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
                                .finalPosition(SECOND_POSITION)
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
                when(resultRepository.save(result)).thenReturn(result);
                when(resultRepository.findDetailedFinishedByRaceId(
                                raceId,
                                ResultStatus.FINISHED)).thenReturn(new ArrayList<>(List.of(result)));
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                configureCompetitorStatistics(competitorId, 1L, 1L, 0L);

                RaceResultResponse response = resultService.updateResult(
                                resultId,
                                new RaceResultUpdateRequest(
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

        @Test
        @DisplayName("returns recently recorded results with default limit")
        void returnsRecentlyRecordedResultsWithDefaultLimit() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer);
                Competitor competitor = competitor(competitorId);
                RaceRegistration registration = registration(
                                UUID.randomUUID(),
                                race,
                                competitor,
                                null,
                                RegistrationStatus.APPROVED,
                                1,
                                organizer);
                RaceResult result = finishedResult(
                                UUID.randomUUID(),
                                registration,
                                organizer,
                                187,
                                0,
                                LocalDateTime.now());

                PageRequest pageable = PageRequest.of(
                                0,
                                5,
                                Sort.by("recordedAt").descending());

                when(resultRepository.findRecentDetailedResults(pageable))
                                .thenReturn(List.of(result));

                List<RaceResultResponse> response = resultService.getRecentResults(null);

                assertThat(response).hasSize(1);
                assertThat(response.getFirst().id()).isEqualTo(result.getId());
                assertThat(response.getFirst().raceId()).isEqualTo(raceId);
                assertThat(response.getFirst().competitorId()).isEqualTo(competitorId);
                assertThat(response.getFirst().recordedAt()).isEqualTo(result.getRecordedAt());

                verify(resultRepository).findRecentDetailedResults(pageable);
        }

        @Test
        @DisplayName("returns recently recorded results with requested limit")
        void returnsRecentlyRecordedResultsWithRequestedLimit() {
                PageRequest pageable = PageRequest.of(
                                0,
                                3,
                                Sort.by("recordedAt").descending());

                when(resultRepository.findRecentDetailedResults(pageable))
                                .thenReturn(List.of());

                List<RaceResultResponse> response = resultService.getRecentResults(3);

                assertThat(response).isEmpty();

                verify(resultRepository).findRecentDetailedResults(pageable);
        }

        @Test
        @DisplayName("rejects invalid recent result limit")
        void rejectsInvalidRecentResultLimit() {
                assertThatThrownBy(() -> resultService.getRecentResults(0))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Limit must be between 1 and 100");

                assertThatThrownBy(() -> resultService.getRecentResults(101))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Limit must be between 1 and 100");

                verify(resultRepository, never()).findRecentDetailedResults(any());
        }

        private void configureCompetitorStatistics(
                        UUID competitorId,
                        long completedRaces,
                        long victories,
                        long defeats) {
                when(resultRepository.countByCompetitorIdAndStatusIn(
                                competitorId,
                                COMPLETED_RACE_STATUSES)).thenReturn(completedRaces);
                when(resultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                                competitorId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(victories);
                when(resultRepository.countDefeatsByCompetitorId(
                                competitorId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(defeats);
        }

        private RaceResult finishedResult(
                        UUID id,
                        RaceRegistration registration,
                        User organizer,
                        long completionTimeSeconds,
                        long penaltyTimeSeconds,
                        LocalDateTime recordedAt) {
                return RaceResult.builder()
                                .id(id)
                                .registration(registration)
                                .startingPosition(registration.getStartingPosition())
                                .finalPosition(null)
                                .completionTime(Duration.ofSeconds(completionTimeSeconds))
                                .penaltyTime(Duration.ofSeconds(penaltyTimeSeconds))
                                .status(ResultStatus.FINISHED)
                                .notes(null)
                                .recordedBy(organizer)
                                .recordedAt(recordedAt)
                                .build();
        }

        private void configureTeamStatistics(
                        UUID teamId,
                        long victories,
                        long defeats) {
                when(teamRepository.findById(teamId)).thenReturn(Optional.of(team(teamId)));
                when(resultRepository.countVictoriesByTeamId(
                                teamId,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(victories);
                when(resultRepository.countDefeatsByTeamId(
                                teamId,
                                ResultStatus.FINISHED,
                                ResultStatus.DID_NOT_FINISH,
                                ResultStatus.DISQUALIFIED,
                                WINNER_POSITION)).thenReturn(defeats);
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