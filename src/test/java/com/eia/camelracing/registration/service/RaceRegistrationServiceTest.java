package com.eia.camelracing.registration.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
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
import com.eia.camelracing.registration.dto.RaceRegistrationRequest;
import com.eia.camelracing.registration.dto.RaceRegistrationResponse;
import com.eia.camelracing.registration.dto.RegistrationRejectRequest;
import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.repository.RaceRegistrationRepository;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.repository.TeamMemberRepository;
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
@DisplayName("Race registration service")
class RaceRegistrationServiceTest {

        private static final List<RegistrationStatus> CAPACITY_CONSUMING_STATUSES = List.of(
                        RegistrationStatus.PENDING,
                        RegistrationStatus.APPROVED);

        @Mock
        private RaceRegistrationRepository registrationRepository;

        @Mock
        private RaceRepository raceRepository;

        @Mock
        private CompetitorRepository competitorRepository;

        @Mock
        private TeamRepository teamRepository;

        @Mock
        private TeamMemberRepository teamMemberRepository;

        @Mock
        private CurrentUserService currentUserService;

        @Mock
        private AuditLogService auditLogService;

        @InjectMocks
        private RaceRegistrationService registrationService;

        @AfterEach
        void clearSecurityContext() {
                SecurityContextHolder.clearContext();
        }

        @Test
        @DisplayName("creates pending individual registration for own organizer race")
        void createsPendingIndividualRegistrationForOwnOrganizerRace() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(registrationRepository.existsByRaceIdAndStartingPositionAndStatusIn(
                                raceId,
                                1,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(false);
                when(registrationRepository.existsByRaceIdAndCompetitorId(raceId, competitorId))
                                .thenReturn(false);
                when(registrationRepository.existsActiveTeamRegistrationForCompetitor(
                                raceId,
                                competitorId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(false);
                when(registrationRepository.save(any(RaceRegistration.class)))
                                .thenAnswer(invocation -> {
                                        RaceRegistration registration = invocation.getArgument(0);
                                        registration.setId(UUID.randomUUID());
                                        return registration;
                                });

                RaceRegistrationResponse response = registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, 1));

                ArgumentCaptor<RaceRegistration> captor = ArgumentCaptor.forClass(RaceRegistration.class);
                verify(registrationRepository).save(captor.capture());

                RaceRegistration savedRegistration = captor.getValue();

                assertThat(response.id()).isNotNull();
                assertThat(response.raceId()).isEqualTo(raceId);
                assertThat(response.competitorId()).isEqualTo(competitorId);
                assertThat(response.teamId()).isNull();
                assertThat(response.status()).isEqualTo(RegistrationStatus.PENDING);
                assertThat(response.startingPosition()).isEqualTo(1);
                assertThat(response.registeredByUserId()).isEqualTo(organizer.getId());
                assertThat(savedRegistration.getRace()).isEqualTo(race);
                assertThat(savedRegistration.getCompetitor()).isEqualTo(competitor);
                assertThat(savedRegistration.getTeam()).isNull();
                assertThat(savedRegistration.getRegisteredBy()).isEqualTo(organizer);
                assertThat(savedRegistration.getRegisteredAt()).isNotNull();
        }

        @Test
        @DisplayName("rejects registration after deadline")
        void rejectsRegistrationAfterDeadline() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                race.setRegistrationDeadline(LocalDateTime.now().minusMinutes(1));

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Registration deadline has passed");

                verify(currentUserService, never()).getOrSynchronizeCurrentUser();
                verify(registrationRepository, never()).countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES);
                verify(competitorRepository, never()).findById(competitorId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects registration with assigned starting position")
        void rejectsRegistrationWithAssignedStartingPosition() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(registrationRepository.existsByRaceIdAndStartingPositionAndStatusIn(
                                raceId,
                                1,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(true);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, 1)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Starting position is already assigned");

                verify(competitorRepository, never()).findById(competitorId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects registration creation for another organizer race")
        void rejectsRegistrationCreationForAnotherOrganizerRace() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User ownerOrganizer = user("owner-organizer");
                User anotherOrganizer = user("another-organizer");
                Race race = race(raceId, ownerOrganizer, 10, RaceType.MIXED);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(anotherOrganizer);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null)))
                                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                                .hasMessage("Race organizer can only manage registrations for own races");

                verify(registrationRepository, never()).countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES);
                verify(registrationRepository, never()).existsByRaceIdAndStartingPositionAndStatusIn(
                                org.mockito.ArgumentMatchers.eq(raceId),
                                org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.eq(CAPACITY_CONSUMING_STATUSES));
                verify(competitorRepository, never()).findById(competitorId);
                verify(teamRepository, never()).findById(any(UUID.class));
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("administrator creates registration for another organizer race")
        void administratorCreatesRegistrationForAnotherOrganizerRace() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User ownerOrganizer = user("owner-organizer");
                User administrator = user("administrator");
                Race race = race(raceId, ownerOrganizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

                authenticateAdministrator();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(administrator);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                when(registrationRepository.existsByRaceIdAndCompetitorId(raceId, competitorId))
                                .thenReturn(false);
                when(registrationRepository.existsActiveTeamRegistrationForCompetitor(
                                raceId,
                                competitorId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(false);
                when(registrationRepository.save(any(RaceRegistration.class)))
                                .thenAnswer(invocation -> {
                                        RaceRegistration registration = invocation.getArgument(0);
                                        registration.setId(UUID.randomUUID());
                                        return registration;
                                });

                RaceRegistrationResponse response = registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null));

                assertThat(response.id()).isNotNull();
                assertThat(response.raceId()).isEqualTo(raceId);
                assertThat(response.competitorId()).isEqualTo(competitorId);
                assertThat(response.status()).isEqualTo(RegistrationStatus.PENDING);
                assertThat(response.registeredByUserId()).isEqualTo(administrator.getId());

                verify(registrationRepository, times(1)).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects registration when race capacity is full")
        void rejectsRegistrationWhenRaceCapacityIsFull() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 1, RaceType.MIXED);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(1L);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Race capacity has been reached");

                verify(registrationRepository, never()).save(any(RaceRegistration.class));
                verify(competitorRepository, never()).findById(competitorId);
        }

        @Test
        @DisplayName("rejects registration for inactive competitor")
        void rejectsRegistrationForInactiveCompetitor() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor injuredCompetitor = competitor(competitorId, CompetitorStatus.INJURED);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(injuredCompetitor));

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Only active competitors can be registered");

                verify(registrationRepository, never()).save(any(RaceRegistration.class));
                verify(registrationRepository, never())
                                .existsByRaceIdAndCompetitorId(raceId, competitorId);
        }

        @Test
        @DisplayName("rejects duplicated individual registration")
        void rejectsDuplicatedIndividualRegistration() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                when(registrationRepository.existsByRaceIdAndCompetitorId(raceId, competitorId))
                                .thenReturn(true);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Competitor is already registered in this race");

                verify(registrationRepository, never()).save(any(RaceRegistration.class));
                verify(registrationRepository, never()).existsActiveTeamRegistrationForCompetitor(
                                raceId,
                                competitorId,
                                CAPACITY_CONSUMING_STATUSES);
        }

        @Test
        @DisplayName("rejects individual registration for competitor already in registered team")
        void rejectsIndividualRegistrationForCompetitorAlreadyInRegisteredTeam() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(competitorRepository.findById(competitorId)).thenReturn(Optional.of(competitor));
                when(registrationRepository.existsByRaceIdAndCompetitorId(raceId, competitorId))
                                .thenReturn(false);
                when(registrationRepository.existsActiveTeamRegistrationForCompetitor(
                                raceId,
                                competitorId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(true);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Competitor is already participating through a registered team");

                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("creates pending team registration for active team")
        void createsPendingTeamRegistrationForActiveTeam() {
                UUID raceId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.TEAM);
                Team team = team(teamId);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(teamMemberRepository.countByTeamIdAndActiveTrue(teamId)).thenReturn(3L);
                when(teamMemberRepository.countActiveMembersWithDifferentCompetitorStatus(
                                teamId,
                                CompetitorStatus.ACTIVE)).thenReturn(0L);
                when(registrationRepository.existsByRaceIdAndTeamId(raceId, teamId))
                                .thenReturn(false);
                when(registrationRepository.save(any(RaceRegistration.class)))
                                .thenAnswer(invocation -> {
                                        RaceRegistration registration = invocation.getArgument(0);
                                        registration.setId(UUID.randomUUID());
                                        return registration;
                                });

                RaceRegistrationResponse response = registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(null, teamId, null));

                ArgumentCaptor<RaceRegistration> captor = ArgumentCaptor.forClass(RaceRegistration.class);
                verify(registrationRepository).save(captor.capture());

                RaceRegistration savedRegistration = captor.getValue();

                assertThat(response.id()).isNotNull();
                assertThat(response.raceId()).isEqualTo(raceId);
                assertThat(response.competitorId()).isNull();
                assertThat(response.teamId()).isEqualTo(teamId);
                assertThat(response.teamName()).isEqualTo("Moonlight Relay");
                assertThat(response.status()).isEqualTo(RegistrationStatus.PENDING);
                assertThat(savedRegistration.getRace()).isEqualTo(race);
                assertThat(savedRegistration.getCompetitor()).isNull();
                assertThat(savedRegistration.getTeam()).isEqualTo(team);
                assertThat(savedRegistration.getRegisteredBy()).isEqualTo(organizer);
                assertThat(savedRegistration.getRegisteredAt()).isNotNull();
        }

        @Test
        @DisplayName("rejects suspended team registration")
        void rejectsSuspendedTeamRegistration() {
                UUID raceId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.TEAM);
                Team suspendedTeam = team(teamId);
                suspendedTeam.setStatus(TeamStatus.SUSPENDED);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(teamRepository.findById(teamId)).thenReturn(Optional.of(suspendedTeam));

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(null, teamId, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Only active teams can be registered");

                verify(teamMemberRepository, never()).countByTeamIdAndActiveTrue(teamId);
                verify(teamMemberRepository, never()).countActiveMembersWithDifferentCompetitorStatus(
                                teamId,
                                CompetitorStatus.ACTIVE);
                verify(registrationRepository, never()).existsByRaceIdAndTeamId(raceId, teamId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects active team registration without active members")
        void rejectsActiveTeamRegistrationWithoutActiveMembers() {
                UUID raceId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.TEAM);
                Team activeTeam = team(teamId);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(teamRepository.findById(teamId)).thenReturn(Optional.of(activeTeam));
                when(teamMemberRepository.countByTeamIdAndActiveTrue(teamId)).thenReturn(0L);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(null, teamId, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Team must have at least one active member");

                verify(teamMemberRepository, never()).countActiveMembersWithDifferentCompetitorStatus(
                                teamId,
                                CompetitorStatus.ACTIVE);
                verify(registrationRepository, never()).existsByRaceIdAndTeamId(raceId, teamId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects active team registration with inactive competitor member")
        void rejectsActiveTeamRegistrationWithInactiveCompetitorMember() {
                UUID raceId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.TEAM);
                Team activeTeam = team(teamId);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);
                when(teamRepository.findById(teamId)).thenReturn(Optional.of(activeTeam));
                when(teamMemberRepository.countByTeamIdAndActiveTrue(teamId)).thenReturn(1L);
                when(teamMemberRepository.countActiveMembersWithDifferentCompetitorStatus(
                                teamId,
                                CompetitorStatus.ACTIVE)).thenReturn(1L);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(null, teamId, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("All active team members must be active competitors");

                verify(registrationRepository, never()).existsByRaceIdAndTeamId(raceId, teamId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects team registration for individual race")
        void rejectsTeamRegistrationForIndividualRace() {
                UUID raceId = UUID.randomUUID();
                UUID teamId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.INDIVIDUAL);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(null, teamId, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Individual races do not accept teams");

                verify(teamRepository, never()).findById(teamId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects individual registration for team race")
        void rejectsIndividualRegistrationForTeamRace() {
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.TEAM);

                authenticateOrganizer();

                when(raceRepository.findById(raceId)).thenReturn(Optional.of(race));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.countByRaceIdAndStatusIn(
                                raceId,
                                CAPACITY_CONSUMING_STATUSES)).thenReturn(0L);

                assertThatThrownBy(() -> registrationService.createRegistration(
                                raceId,
                                new RaceRegistrationRequest(competitorId, null, null)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Team races do not accept individual competitors");

                verify(competitorRepository, never()).findById(competitorId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("approves pending registration without changing controlled fields")
        void approvesPendingRegistrationWithoutChangingControlledFields() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);
                LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(10);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(registeredAt)
                                .status(RegistrationStatus.PENDING)
                                .startingPosition(3)
                                .validationNotes("Initial validation note")
                                .registeredBy(organizer)
                                .build();

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.save(registration)).thenReturn(registration);

                RaceRegistrationResponse response = registrationService.approveRegistration(registrationId);

                assertThat(response.status()).isEqualTo(RegistrationStatus.APPROVED);
                assertThat(response.raceId()).isEqualTo(raceId);
                assertThat(response.competitorId()).isEqualTo(competitorId);
                assertThat(response.teamId()).isNull();
                assertThat(response.registeredAt()).isEqualTo(registeredAt);
                assertThat(response.startingPosition()).isEqualTo(3);
                assertThat(response.validationNotes()).isEqualTo("Initial validation note");
                assertThat(response.registeredByUserId()).isEqualTo(organizer.getId());

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.APPROVED);
                assertThat(registration.getRace()).isEqualTo(race);
                assertThat(registration.getCompetitor()).isEqualTo(competitor);
                assertThat(registration.getTeam()).isNull();
                assertThat(registration.getRegisteredAt()).isEqualTo(registeredAt);
                assertThat(registration.getStartingPosition()).isEqualTo(3);
                assertThat(registration.getValidationNotes()).isEqualTo("Initial validation note");
                assertThat(registration.getRegisteredBy()).isEqualTo(organizer);

                verify(registrationRepository).findDetailedById(registrationId);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_REGISTRATION_APPROVED),
                                eq("REGISTRATION"),
                                eq(registrationId.toString()),
                                eq("Registration approved"),
                                eq("status=PENDING"),
                                eq("status=APPROVED"));
        }

        @Test
        @DisplayName("rejects approval of non-pending registration")
        void rejectsApprovalOfNonPendingRegistration() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(LocalDateTime.now().minusMinutes(10))
                                .status(RegistrationStatus.APPROVED)
                                .startingPosition(3)
                                .validationNotes("Already approved")
                                .registeredBy(organizer)
                                .build();

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> registrationService.approveRegistration(registrationId))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Only pending registrations can be approved");

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.APPROVED);
                assertThat(registration.getValidationNotes()).isEqualTo("Already approved");

                verify(registrationRepository).findDetailedById(registrationId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects pending registration with validation reason")
        void rejectsPendingRegistrationWithValidationReason() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);
                LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(10);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(registeredAt)
                                .status(RegistrationStatus.PENDING)
                                .startingPosition(4)
                                .validationNotes(null)
                                .registeredBy(organizer)
                                .build();

                RegistrationRejectRequest request = new RegistrationRejectRequest(
                                "Participant does not meet the event requirements");

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.save(registration)).thenReturn(registration);

                RaceRegistrationResponse response = registrationService.rejectRegistration(
                                registrationId,
                                request);

                assertThat(response.status()).isEqualTo(RegistrationStatus.REJECTED);
                assertThat(response.validationNotes()).isEqualTo(
                                "Participant does not meet the event requirements");
                assertThat(response.raceId()).isEqualTo(raceId);
                assertThat(response.competitorId()).isEqualTo(competitorId);
                assertThat(response.teamId()).isNull();
                assertThat(response.registeredAt()).isEqualTo(registeredAt);
                assertThat(response.startingPosition()).isEqualTo(4);
                assertThat(response.registeredByUserId()).isEqualTo(organizer.getId());

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.REJECTED);
                assertThat(registration.getValidationNotes()).isEqualTo(
                                "Participant does not meet the event requirements");
                assertThat(registration.getRace()).isEqualTo(race);
                assertThat(registration.getCompetitor()).isEqualTo(competitor);
                assertThat(registration.getTeam()).isNull();
                assertThat(registration.getRegisteredAt()).isEqualTo(registeredAt);
                assertThat(registration.getStartingPosition()).isEqualTo(4);
                assertThat(registration.getRegisteredBy()).isEqualTo(organizer);

                verify(registrationRepository).findDetailedById(registrationId);
                verify(registrationRepository, times(1)).save(registration);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_REGISTRATION_REJECTED),
                                eq("REGISTRATION"),
                                eq(registrationId.toString()),
                                eq("Registration rejected"),
                                eq("status=PENDING"),
                                eq("status=REJECTED, reason=Participant does not meet the event requirements"));
        }

        @Test
        @DisplayName("rejects rejection of non-pending registration")
        void rejectsRejectionOfNonPendingRegistration() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(LocalDateTime.now().minusMinutes(10))
                                .status(RegistrationStatus.APPROVED)
                                .startingPosition(4)
                                .validationNotes("Already approved")
                                .registeredBy(organizer)
                                .build();

                RegistrationRejectRequest request = new RegistrationRejectRequest(
                                "Participant is not eligible");

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> registrationService.rejectRegistration(
                                registrationId,
                                request))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Only pending registrations can be rejected");

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.APPROVED);
                assertThat(registration.getValidationNotes()).isEqualTo("Already approved");

                verify(registrationRepository).findDetailedById(registrationId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("cancels pending registration without changing controlled fields")
        void cancelsPendingRegistrationWithoutChangingControlledFields() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);
                LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(10);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(registeredAt)
                                .status(RegistrationStatus.PENDING)
                                .startingPosition(5)
                                .validationNotes("Pending registration")
                                .registeredBy(organizer)
                                .build();

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.save(registration)).thenReturn(registration);

                registrationService.cancelRegistration(registrationId);

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.CANCELLED);
                assertThat(registration.getRace()).isEqualTo(race);
                assertThat(registration.getCompetitor()).isEqualTo(competitor);
                assertThat(registration.getTeam()).isNull();
                assertThat(registration.getRegisteredAt()).isEqualTo(registeredAt);
                assertThat(registration.getStartingPosition()).isEqualTo(5);
                assertThat(registration.getValidationNotes()).isEqualTo("Pending registration");
                assertThat(registration.getRegisteredBy()).isEqualTo(organizer);

                verify(registrationRepository).findDetailedById(registrationId);
                verify(registrationRepository, times(1)).save(registration);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_REGISTRATION_CANCELLED),
                                eq("REGISTRATION"),
                                eq(registrationId.toString()),
                                eq("Registration cancelled"),
                                eq("status=PENDING"),
                                eq("status=CANCELLED"));
        }

        @Test
        @DisplayName("cancels approved registration without changing controlled fields")
        void cancelsApprovedRegistrationWithoutChangingControlledFields() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);
                LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(10);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(registeredAt)
                                .status(RegistrationStatus.APPROVED)
                                .startingPosition(6)
                                .validationNotes("Approved registration")
                                .registeredBy(organizer)
                                .build();

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
                when(registrationRepository.save(registration)).thenReturn(registration);

                registrationService.cancelRegistration(registrationId);

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.CANCELLED);
                assertThat(registration.getRace()).isEqualTo(race);
                assertThat(registration.getCompetitor()).isEqualTo(competitor);
                assertThat(registration.getTeam()).isNull();
                assertThat(registration.getRegisteredAt()).isEqualTo(registeredAt);
                assertThat(registration.getStartingPosition()).isEqualTo(6);
                assertThat(registration.getValidationNotes()).isEqualTo("Approved registration");
                assertThat(registration.getRegisteredBy()).isEqualTo(organizer);

                verify(registrationRepository).findDetailedById(registrationId);
                verify(registrationRepository, times(1)).save(registration);
                verify(auditLogService).log(
                                eq(organizer),
                                eq(AuditLogService.ACTION_REGISTRATION_CANCELLED),
                                eq("REGISTRATION"),
                                eq(registrationId.toString()),
                                eq("Registration cancelled"),
                                eq("status=APPROVED"),
                                eq("status=CANCELLED"));
        }

        @Test
        @DisplayName("cancels cancelled registration idempotently without saving")
        void cancelsCancelledRegistrationIdempotentlyWithoutSaving() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);
                LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(10);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(registeredAt)
                                .status(RegistrationStatus.CANCELLED)
                                .startingPosition(7)
                                .validationNotes("Previously cancelled")
                                .registeredBy(organizer)
                                .build();

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                registrationService.cancelRegistration(registrationId);

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.CANCELLED);
                assertThat(registration.getRace()).isEqualTo(race);
                assertThat(registration.getCompetitor()).isEqualTo(competitor);
                assertThat(registration.getTeam()).isNull();
                assertThat(registration.getRegisteredAt()).isEqualTo(registeredAt);
                assertThat(registration.getStartingPosition()).isEqualTo(7);
                assertThat(registration.getValidationNotes()).isEqualTo("Previously cancelled");
                assertThat(registration.getRegisteredBy()).isEqualTo(organizer);

                verify(registrationRepository).findDetailedById(registrationId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
        }

        @Test
        @DisplayName("rejects cancellation of rejected registration")
        void rejectsCancellationOfRejectedRegistration() {
                UUID registrationId = UUID.randomUUID();
                UUID raceId = UUID.randomUUID();
                UUID competitorId = UUID.randomUUID();

                User organizer = user("organizer");
                Race race = race(raceId, organizer, 10, RaceType.MIXED);
                Competitor competitor = competitor(competitorId, CompetitorStatus.ACTIVE);
                LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(10);

                RaceRegistration registration = RaceRegistration.builder()
                                .id(registrationId)
                                .race(race)
                                .competitor(competitor)
                                .registeredAt(registeredAt)
                                .status(RegistrationStatus.REJECTED)
                                .startingPosition(8)
                                .validationNotes("Participant was rejected")
                                .registeredBy(organizer)
                                .build();

                authenticateOrganizer();

                when(registrationRepository.findDetailedById(registrationId))
                                .thenReturn(Optional.of(registration));
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);

                assertThatThrownBy(() -> registrationService.cancelRegistration(registrationId))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Only pending or approved registrations can be cancelled");

                assertThat(registration.getStatus()).isEqualTo(RegistrationStatus.REJECTED);
                assertThat(registration.getRace()).isEqualTo(race);
                assertThat(registration.getCompetitor()).isEqualTo(competitor);
                assertThat(registration.getTeam()).isNull();
                assertThat(registration.getRegisteredAt()).isEqualTo(registeredAt);
                assertThat(registration.getStartingPosition()).isEqualTo(8);
                assertThat(registration.getValidationNotes()).isEqualTo("Participant was rejected");
                assertThat(registration.getRegisteredBy()).isEqualTo(organizer);

                verify(registrationRepository).findDetailedById(registrationId);
                verify(registrationRepository, never()).save(any(RaceRegistration.class));
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

        private Race race(
                        UUID id,
                        User organizer,
                        int maxParticipants,
                        RaceType raceType) {
                return Race.builder()
                                .id(id)
                                .name("Registration Test Race")
                                .description("Race used for registration service tests")
                                .scheduledAt(LocalDateTime.now().plusDays(3))
                                .startLocation("Start")
                                .finishLocation("Finish")
                                .distanceMeters(new BigDecimal("1000.00"))
                                .maxParticipants(maxParticipants)
                                .raceType(raceType)
                                .status(RaceStatus.OPEN_FOR_REGISTRATION)
                                .organizer(organizer)
                                .registrationDeadline(LocalDateTime.now().plusDays(2))
                                .createdAt(LocalDateTime.now().minusHours(1))
                                .updatedAt(LocalDateTime.now().minusMinutes(5))
                                .build();
        }

        private Competitor competitor(UUID id, CompetitorStatus status) {
                return Competitor.builder()
                                .id(id)
                                .name("Tiny Docker")
                                .nickname("TinyDocker")
                                .competitorType(CompetitorType.DWARF)
                                .approximateAge(21)
                                .weightKg(new BigDecimal("50.00"))
                                .heightCm(new BigDecimal("120.00"))
                                .origin("Colombia")
                                .status(status)
                                .registrationDate(LocalDateTime.now().minusDays(1))
                                .victories(0)
                                .defeats(0)
                                .completedRaces(0)
                                .build();
        }

        private Team team(UUID id) {
                return Team.builder()
                                .id(id)
                                .name("Moonlight Relay")
                                .description("A team for moonlight relays")
                                .coachName("Ranni")
                                .status(TeamStatus.ACTIVE)
                                .createdAt(LocalDateTime.now().minusDays(2))
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