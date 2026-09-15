package com.eia.camelracing.race.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.common.service.CurrentUserService;
import com.eia.camelracing.race.dto.RaceRequest;
import com.eia.camelracing.race.dto.RaceResponse;
import com.eia.camelracing.race.dto.RaceStatusRequest;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.race.repository.RaceRepository;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.repository.RaceRegistrationRepository;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.result.repository.RaceResultRepository;
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.AfterEach;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@DisplayName("Race service")
class RaceServiceTest {

        private static final int WINNER_POSITION = 1;

        private static final List<RegistrationStatus> APPROVED_REGISTRATION_STATUSES = List.of(
                        RegistrationStatus.APPROVED);

        @Mock
        private RaceRepository raceRepository;

        @Mock
        private RaceRegistrationRepository registrationRepository;

        @Mock
        private RaceResultRepository resultRepository;

        @Mock
        private CurrentUserService currentUserService;

        @Mock
        private AuditLogService auditLogService;

        @InjectMocks
        private RaceService raceService;

        @AfterEach
        void clearSecurityContext() {
                SecurityContextHolder.clearContext();
        }

        @Test
        @DisplayName("creates draft race with synchronized organizer and audit log")
        void createsDraftRaceWithSynchronizedOrganizerAndAuditLog() {
                UUID raceId = UUID.randomUUID();
                User organizer = organizer();

                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(raceRepository.save(any(Race.class))).thenAnswer(invocation -> {
                        Race race = invocation.getArgument(0);
                        race.setId(raceId);
                        return race;
                });

                RaceResponse response = raceService.createRace(request());

                ArgumentCaptor<Race> captor = ArgumentCaptor.forClass(Race.class);
                verify(raceRepository).save(captor.capture());

                Race savedRace = captor.getValue();

                assertThat(response.id()).isEqualTo(raceId);
                assertThat(response.status()).isEqualTo(RaceStatus.DRAFT);
                assertThat(response.organizerId()).isEqualTo(organizer.getId());
                assertThat(response.createdAt()).isNotNull();
                assertThat(response.updatedAt()).isNotNull();
                assertThat(savedRace.getOrganizer()).isEqualTo(organizer);

                verify(currentUserService).getOrSynchronizeCurrentUser();
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RACE_CREATED),
                                eq("RACE"),
                                eq(raceId.toString()),
                                eq("Race created"),
                                eq(null),
                                eq("name=The Great Mixed Race, description=A mixed academic race, "
                                                + "scheduledAt=" + savedRace.getScheduledAt()
                                                + ", startLocation=EIA Start, finishLocation=EIA Finish, "
                                                + "distanceMeters=1000.00, maxParticipants=10, raceType=MIXED, "
                                                + "status=DRAFT, registrationDeadline="
                                                + savedRace.getRegistrationDeadline()
                                                + ", organizerUsername=organizer"));
        }

        @Test
        @DisplayName("returns filtered paginated races")
        void returnsFilteredPaginatedRaces() {
                Race race = race(RaceStatus.DRAFT, organizer());
                race.setId(UUID.randomUUID());

                PageRequest pageable = PageRequest.of(
                                0,
                                10,
                                Sort.by("scheduledAt").ascending());

                when(raceRepository.findAllByFilters(
                                RaceStatus.DRAFT,
                                RaceType.MIXED,
                                "great",
                                pageable)).thenReturn(new PageImpl<>(List.of(race), pageable, 1));

                PageResponse<RaceResponse> response = raceService.getRaces(
                                RaceStatus.DRAFT,
                                RaceType.MIXED,
                                "great",
                                0,
                                10,
                                "scheduledAt,asc");

                assertThat(response.content()).hasSize(1);
                assertThat(response.content().getFirst().name())
                                .isEqualTo("The Great Mixed Race");
                assertThat(response.totalElements()).isEqualTo(1);
                assertThat(response.first()).isTrue();
                assertThat(response.last()).isTrue();
        }

        @Test
        @DisplayName("allows organizer to update own race")
        void allowsOrganizerToUpdateOwnRace() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.DRAFT, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRace(id, request());

                assertThat(response.name()).isEqualTo("The Great Mixed Race");
                verify(raceRepository).save(race);
        }

        @Test
        @DisplayName("rejects update of in-progress race without persisting changes")
        void rejectsUpdateOfInProgressRaceWithoutPersistingChanges() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.IN_PROGRESS, organizer);
                race.setId(id);

                String originalName = race.getName();
                String originalDescription = race.getDescription();
                LocalDateTime originalScheduledAt = race.getScheduledAt();
                String originalStartLocation = race.getStartLocation();
                String originalFinishLocation = race.getFinishLocation();
                BigDecimal originalDistanceMeters = race.getDistanceMeters();
                int originalMaxParticipants = race.getMaxParticipants();
                RaceType originalRaceType = race.getRaceType();
                LocalDateTime originalRegistrationDeadline = race.getRegistrationDeadline();
                LocalDateTime originalUpdatedAt = race.getUpdatedAt();

                RaceRequest modifiedRequest = new RaceRequest(
                                "Changed In Progress Race",
                                "Changed description",
                                originalScheduledAt.plusDays(1),
                                "Changed Start",
                                "Changed Finish",
                                new BigDecimal("2500.00"),
                                originalMaxParticipants + 1,
                                RaceType.INDIVIDUAL,
                                originalRegistrationDeadline.plusDays(1));

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> raceService.updateRace(id, modifiedRequest))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("In-progress or terminal races cannot be updated");

                assertThat(race.getName()).isEqualTo(originalName);
                assertThat(race.getDescription()).isEqualTo(originalDescription);
                assertThat(race.getScheduledAt()).isEqualTo(originalScheduledAt);
                assertThat(race.getStartLocation()).isEqualTo(originalStartLocation);
                assertThat(race.getFinishLocation()).isEqualTo(originalFinishLocation);
                assertThat(race.getDistanceMeters()).isEqualByComparingTo(
                                originalDistanceMeters);
                assertThat(race.getMaxParticipants()).isEqualTo(originalMaxParticipants);
                assertThat(race.getRaceType()).isEqualTo(originalRaceType);
                assertThat(race.getRegistrationDeadline())
                                .isEqualTo(originalRegistrationDeadline);
                assertThat(race.getUpdatedAt()).isEqualTo(originalUpdatedAt);

                verify(raceRepository, never()).save(any(Race.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("rejects organizer update for another organizer race")
        void rejectsOrganizerUpdateForAnotherOrganizerRace() {
                UUID id = UUID.randomUUID();
                User ownerOrganizer = user("owner-organizer");
                User anotherOrganizer = user("another-organizer");
                Race race = race(RaceStatus.DRAFT, ownerOrganizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser())
                                .thenReturn(anotherOrganizer);

                assertThatThrownBy(() -> raceService.updateRace(id, request()))
                                .isInstanceOf(
                                                org.springframework.security.access.AccessDeniedException.class)
                                .hasMessage("Race organizer can only manage own races");

                verify(raceRepository, never()).save(any(Race.class));
        }

        @Test
        @DisplayName("allows administrator to update another organizer race")
        void allowsAdministratorToUpdateAnotherOrganizerRace() {
                UUID id = UUID.randomUUID();
                User ownerOrganizer = user("owner-organizer");
                User administrator = user("administrator");
                Race race = race(RaceStatus.DRAFT, ownerOrganizer);
                race.setId(id);

                authenticateAdministrator();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser())
                                .thenReturn(administrator);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRace(id, request());

                assertThat(response.name()).isEqualTo("The Great Mixed Race");
                verify(raceRepository).save(race);
        }

        @Test
        @DisplayName("allows valid draft to open transition and audits status change")
        void allowsValidDraftToOpenTransitionAndAuditsStatusChange() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.DRAFT, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.OPEN_FOR_REGISTRATION));

                assertThat(response.status()).isEqualTo(RaceStatus.OPEN_FOR_REGISTRATION);
                verify(raceRepository).save(race);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RACE_STATUS_CHANGED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race status changed"),
                                eq("status=DRAFT"),
                                eq("status=OPEN_FOR_REGISTRATION"));
        }

        @Test
        @DisplayName("allows reopening registration and audits status change")
        void allowsReopeningRegistrationAndAuditsStatusChange() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.CLOSED_FOR_REGISTRATION, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.OPEN_FOR_REGISTRATION));

                assertThat(response.status()).isEqualTo(RaceStatus.OPEN_FOR_REGISTRATION);
                verify(raceRepository).save(race);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RACE_STATUS_CHANGED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race status changed"),
                                eq("status=CLOSED_FOR_REGISTRATION"),
                                eq("status=OPEN_FOR_REGISTRATION"));
        }

        @Test
        @DisplayName("rejects organizer status update for another organizer race")
        void rejectsOrganizerStatusUpdateForAnotherOrganizerRace() {
                UUID id = UUID.randomUUID();
                User ownerOrganizer = user("owner-organizer");
                User anotherOrganizer = user("another-organizer");
                Race race = race(RaceStatus.DRAFT, ownerOrganizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser())
                                .thenReturn(anotherOrganizer);

                assertThatThrownBy(() -> raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.OPEN_FOR_REGISTRATION)))
                                .isInstanceOf(
                                                org.springframework.security.access.AccessDeniedException.class)
                                .hasMessage("Race organizer can only manage own races");

                verify(raceRepository, never()).save(any(Race.class));
        }

        @Test
        @DisplayName("allows administrator status update for another organizer race")
        void allowsAdministratorStatusUpdateForAnotherOrganizerRace() {
                UUID id = UUID.randomUUID();
                User ownerOrganizer = user("owner-organizer");
                User administrator = user("administrator");
                Race race = race(RaceStatus.DRAFT, ownerOrganizer);
                race.setId(id);

                authenticateAdministrator();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser())
                                .thenReturn(administrator);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.OPEN_FOR_REGISTRATION));

                assertThat(response.status()).isEqualTo(RaceStatus.OPEN_FOR_REGISTRATION);
                verify(raceRepository).save(race);
                verify(auditLogService).log(
                                eq(administrator),
                                eq(AuditLogService.ACTION_RACE_STATUS_CHANGED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race status changed"),
                                eq("status=DRAFT"),
                                eq("status=OPEN_FOR_REGISTRATION"));
        }

        @Test
        @DisplayName("rejects closing registration with fewer than two approved participants")
        void rejectsClosingRegistrationWithFewerThanTwoApprovedParticipants() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.OPEN_FOR_REGISTRATION, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES)).thenReturn(1L);

                assertThatThrownBy(() -> raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.CLOSED_FOR_REGISTRATION)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage(
                                                "A race needs at least two approved participants before it can be closed or started");

                assertThat(race.getStatus()).isEqualTo(RaceStatus.OPEN_FOR_REGISTRATION);
                verify(registrationRepository).countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES);
                verify(raceRepository, never()).save(any(Race.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("allows closing registration with two approved participants and audits status change")
        void allowsClosingRegistrationWithTwoApprovedParticipantsAndAuditsStatusChange() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.OPEN_FOR_REGISTRATION, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES)).thenReturn(2L);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.CLOSED_FOR_REGISTRATION));

                assertThat(response.status()).isEqualTo(RaceStatus.CLOSED_FOR_REGISTRATION);
                verify(registrationRepository).countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES);
                verify(raceRepository).save(race);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RACE_STATUS_CHANGED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race status changed"),
                                eq("status=OPEN_FOR_REGISTRATION"),
                                eq("status=CLOSED_FOR_REGISTRATION"));
        }

        @Test
        @DisplayName("rejects starting race with fewer than two approved participants")
        void rejectsStartingRaceWithFewerThanTwoApprovedParticipants() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.CLOSED_FOR_REGISTRATION, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES)).thenReturn(0L);

                assertThatThrownBy(() -> raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.IN_PROGRESS)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage(
                                                "A race needs at least two approved participants before it can be closed or started");

                assertThat(race.getStatus()).isEqualTo(RaceStatus.CLOSED_FOR_REGISTRATION);
                verify(registrationRepository).countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES);
                verify(raceRepository, never()).save(any(Race.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("allows starting race with two approved participants and audits status change")
        void allowsStartingRaceWithTwoApprovedParticipantsAndAuditsStatusChange() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.CLOSED_FOR_REGISTRATION, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES)).thenReturn(2L);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.IN_PROGRESS));

                assertThat(response.status()).isEqualTo(RaceStatus.IN_PROGRESS);
                verify(registrationRepository).countByRaceIdAndStatusIn(
                                id,
                                APPROVED_REGISTRATION_STATUSES);
                verify(raceRepository).save(race);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RACE_STATUS_CHANGED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race status changed"),
                                eq("status=CLOSED_FOR_REGISTRATION"),
                                eq("status=IN_PROGRESS"));
        }

        @Test
        @DisplayName("audits cancellation through race status update")
        void auditsCancellationThroughRaceStatusUpdate() {
                UUID id = UUID.randomUUID();
                User currentUser = organizer();
                Race race = race(RaceStatus.DRAFT, currentUser);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(raceRepository.save(race)).thenReturn(race);
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(currentUser);

                RaceResponse response = raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.CANCELLED));

                assertThat(response.status()).isEqualTo(RaceStatus.CANCELLED);
                verify(raceRepository).save(race);
                verify(auditLogService).log(
                                eq(currentUser),
                                eq(AuditLogService.ACTION_RACE_CANCELLED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race cancelled"),
                                eq("status=DRAFT"),
                                eq("status=CANCELLED"));
        }

        @Test
        @DisplayName("rejects in-progress completion without official winner")
        void rejectsInProgressCompletionWithoutOfficialWinner() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.IN_PROGRESS, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsOfficialWinnerByRaceId(
                                id,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(false);

                assertThatThrownBy(() -> raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.COMPLETED)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Race cannot be completed without an official winner");

                assertThat(race.getStatus()).isEqualTo(RaceStatus.IN_PROGRESS);
                verify(resultRepository).existsOfficialWinnerByRaceId(
                                id,
                                ResultStatus.FINISHED,
                                WINNER_POSITION);
                verify(registrationRepository, never()).countByRaceIdAndStatusWithoutResult(
                                any(UUID.class),
                                any(RegistrationStatus.class));
                verify(raceRepository, never()).save(any(Race.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("rejects in-progress completion when approved participants have no official result")
        void rejectsInProgressCompletionWhenApprovedParticipantsHaveNoOfficialResult() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.IN_PROGRESS, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsOfficialWinnerByRaceId(
                                id,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(true);
                when(registrationRepository.countByRaceIdAndStatusWithoutResult(
                                id,
                                RegistrationStatus.APPROVED)).thenReturn(1L);

                assertThatThrownBy(() -> raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.COMPLETED)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage(
                                                "Race cannot be completed while approved participants have no official result");

                assertThat(race.getStatus()).isEqualTo(RaceStatus.IN_PROGRESS);
                verify(resultRepository).existsOfficialWinnerByRaceId(
                                id,
                                ResultStatus.FINISHED,
                                WINNER_POSITION);
                verify(registrationRepository).countByRaceIdAndStatusWithoutResult(
                                id,
                                RegistrationStatus.APPROVED);
                verify(raceRepository, never()).save(any(Race.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("allows in-progress completion with official winner and completed registrations")
        void allowsInProgressCompletionWithOfficialWinnerAndCompletedRegistrations() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.IN_PROGRESS, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(resultRepository.existsOfficialWinnerByRaceId(
                                id,
                                ResultStatus.FINISHED,
                                WINNER_POSITION)).thenReturn(true);
                when(registrationRepository.countByRaceIdAndStatusWithoutResult(
                                id,
                                RegistrationStatus.APPROVED)).thenReturn(0L);
                when(raceRepository.save(race)).thenReturn(race);

                RaceResponse response = raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.COMPLETED));

                assertThat(response.status()).isEqualTo(RaceStatus.COMPLETED);
                verify(resultRepository).existsOfficialWinnerByRaceId(
                                id,
                                ResultStatus.FINISHED,
                                WINNER_POSITION);
                verify(registrationRepository).countByRaceIdAndStatusWithoutResult(
                                id,
                                RegistrationStatus.APPROVED);
                verify(raceRepository).save(race);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_RACE_COMPLETED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race completed"),
                                eq("status=IN_PROGRESS"),
                                eq("status=COMPLETED"));
        }

        @Test
        @DisplayName("rejects invalid draft to completed transition")
        void rejectsInvalidDraftToCompletedTransition() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.DRAFT, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> raceService.updateRaceStatus(
                                id,
                                new RaceStatusRequest(RaceStatus.COMPLETED)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Invalid race status transition from DRAFT to COMPLETED");
        }

        @Test
        @DisplayName("cancels draft race for owner organizer")
        void cancelsDraftRaceForOwnerOrganizer() {
                UUID id = UUID.randomUUID();
                User currentUser = organizer();
                Race race = race(RaceStatus.DRAFT, currentUser);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(raceRepository.save(race)).thenReturn(race);
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(currentUser);

                raceService.cancelRace(id);

                assertThat(race.getStatus()).isEqualTo(RaceStatus.CANCELLED);
                assertThat(race.getUpdatedAt()).isNotNull();

                verify(raceRepository).save(race);
                verify(currentUserService).getOrSynchronizeCurrentUser();
                verify(auditLogService).log(
                                eq(currentUser),
                                eq(AuditLogService.ACTION_RACE_CANCELLED),
                                eq("RACE"),
                                eq(id.toString()),
                                eq("Race cancelled"),
                                eq("status=DRAFT"),
                                eq("status=CANCELLED"));
        }

        @Test
        @DisplayName("rejects organizer cancellation for another organizer race")
        void rejectsOrganizerCancellationForAnotherOrganizerRace() {
                UUID id = UUID.randomUUID();
                User ownerOrganizer = user("owner-organizer");
                User anotherOrganizer = user("another-organizer");
                Race race = race(RaceStatus.DRAFT, ownerOrganizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser())
                                .thenReturn(anotherOrganizer);

                assertThatThrownBy(() -> raceService.cancelRace(id))
                                .isInstanceOf(
                                                org.springframework.security.access.AccessDeniedException.class)
                                .hasMessage("Race organizer can only manage own races");

                assertThat(race.getStatus()).isEqualTo(RaceStatus.DRAFT);
                verify(raceRepository, never()).save(any(Race.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("allows administrator cancellation for another organizer race")
        void allowsAdministratorCancellationForAnotherOrganizerRace() {
                UUID id = UUID.randomUUID();
                User ownerOrganizer = user("owner-organizer");
                User administrator = user("administrator");
                Race race = race(RaceStatus.DRAFT, ownerOrganizer);
                race.setId(id);

                authenticateAdministrator();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser())
                                .thenReturn(administrator);
                when(raceRepository.save(race)).thenReturn(race);

                raceService.cancelRace(id);

                assertThat(race.getStatus()).isEqualTo(RaceStatus.CANCELLED);
                verify(raceRepository).save(race);
        }

        @Test
        @DisplayName("cancellation is idempotent for cancelled race")
        void cancellationIsIdempotentForCancelledRace() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.CANCELLED, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                raceService.cancelRace(id);

                verify(raceRepository).findById(id);
        }

        @Test
        @DisplayName("rejects cancellation of completed race")
        void rejectsCancellationOfCompletedRace() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.COMPLETED, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> raceService.cancelRace(id))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Completed races cannot be cancelled");
        }

        @Test
        @DisplayName("rejects cancellation of in-progress race")
        void rejectsCancellationOfInProgressRace() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.IN_PROGRESS, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> raceService.cancelRace(id))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("In-progress races cannot be cancelled");
        }

        @Test
        @DisplayName("rejects update of completed race")
        void rejectsUpdateOfCompletedRace() {
                UUID id = UUID.randomUUID();
                User organizer = organizer();
                Race race = race(RaceStatus.COMPLETED, organizer);
                race.setId(id);

                authenticateOrganizer();
                when(raceRepository.findById(id)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> raceService.updateRace(id, request()))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("In-progress or terminal races cannot be updated");

                verify(raceRepository, never()).save(any(Race.class));
        }

        @Test
        @DisplayName("rejects invalid page size")
        void rejectsInvalidPageSize() {
                assertThatThrownBy(() -> raceService.getRaces(
                                null,
                                null,
                                null,
                                0,
                                101,
                                "scheduledAt,asc"))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Size must be between 1 and 100");
        }

        @Test
        @DisplayName("throws not found when race does not exist")
        void throwsNotFoundWhenRaceDoesNotExist() {
                UUID id = UUID.randomUUID();

                when(raceRepository.findById(id)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> raceService.getRaceById(id))
                                .isInstanceOf(NoSuchElementException.class)
                                .hasMessageContaining("Race with id");
        }

        private void verifyNoAuditLog() {
                verify(auditLogService, never()).log(
                                any(User.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class));
        }

        private void authenticateOrganizer() {
                SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(
                                                "organizer",
                                                "password",
                                                List.of(new SimpleGrantedAuthority(
                                                                "ROLE_RACE_ORGANIZER"))));
        }

        private void authenticateAdministrator() {
                SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(
                                                "administrator",
                                                "password",
                                                List.of(new SimpleGrantedAuthority(
                                                                "ROLE_ADMINISTRATOR"))));
        }

        private RaceRequest request() {
                return new RaceRequest(
                                "The Great Mixed Race",
                                "A mixed academic race",
                                LocalDateTime.now().plusDays(5),
                                "EIA Start",
                                "EIA Finish",
                                new BigDecimal("1000.00"),
                                10,
                                RaceType.MIXED,
                                LocalDateTime.now().plusDays(4));
        }

        private Race race(RaceStatus status, User organizer) {
                return Race.builder()
                                .name("The Great Mixed Race")
                                .description("A mixed academic race")
                                .scheduledAt(LocalDateTime.now().plusDays(5))
                                .startLocation("EIA Start")
                                .finishLocation("EIA Finish")
                                .distanceMeters(new BigDecimal("1000.00"))
                                .maxParticipants(10)
                                .raceType(RaceType.MIXED)
                                .status(status)
                                .organizer(organizer)
                                .registrationDeadline(LocalDateTime.now().plusDays(4))
                                .createdAt(LocalDateTime.now().minusHours(1))
                                .updatedAt(LocalDateTime.now().minusMinutes(5))
                                .build();
        }

        private User organizer() {
                return user("organizer");
        }

        private User user(String username) {
                return User.builder()
                                .id(UUID.randomUUID())
                                .keycloakSubject("keycloak-subject-" + username)
                                .username(username)
                                .email(username + "@camel-racing.test")
                                .firstName("Race")
                                .lastName("Organizer")
                                .enabled(true)
                                .createdAt(LocalDateTime.now().minusDays(3))
                                .build();
        }
}