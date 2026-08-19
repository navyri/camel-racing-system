package com.eia.camelracing.race.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

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
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
@DisplayName("Race service")
class RaceServiceTest {

    @Mock
    private RaceRepository raceRepository;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private RaceService raceService;

    @Test
    @DisplayName("creates draft race with synchronized organizer")
    void createsDraftRaceWithSynchronizedOrganizer() {
        User organizer = organizer();

        when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(organizer);
        when(raceRepository.save(any(Race.class))).thenAnswer(invocation -> {
            Race race = invocation.getArgument(0);
            race.setId(UUID.randomUUID());
            return race;
        });

        RaceResponse response = raceService.createRace(request());

        assertThat(response.id()).isNotNull();
        assertThat(response.status()).isEqualTo(RaceStatus.DRAFT);
        assertThat(response.organizerId()).isEqualTo(organizer.getId());
        assertThat(response.createdAt()).isNotNull();
        assertThat(response.updatedAt()).isNotNull();

        verify(currentUserService).getOrSynchronizeCurrentUser();
        verify(raceRepository).save(any(Race.class));
    }

    @Test
    @DisplayName("returns filtered paginated races")
    void returnsFilteredPaginatedRaces() {
        Race race = race(RaceStatus.DRAFT);
        race.setId(UUID.randomUUID());

        PageRequest pageable = PageRequest.of(
                0,
                10,
                Sort.by("scheduledAt").ascending()
        );

        when(raceRepository.findAllByFilters(
                RaceStatus.DRAFT,
                RaceType.MIXED,
                "great",
                pageable
        )).thenReturn(new PageImpl<>(List.of(race), pageable, 1));

        PageResponse<RaceResponse> response = raceService.getRaces(
                RaceStatus.DRAFT,
                RaceType.MIXED,
                "great",
                0,
                10,
                "scheduledAt,asc"
        );

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().name()).isEqualTo("The Great Mixed Race");
        assertThat(response.totalElements()).isEqualTo(1);
        assertThat(response.first()).isTrue();
        assertThat(response.last()).isTrue();
    }

    @Test
    @DisplayName("allows valid draft to open transition")
    void allowsValidDraftToOpenTransition() {
        UUID id = UUID.randomUUID();
        Race race = race(RaceStatus.DRAFT);
        race.setId(id);

        when(raceRepository.findById(id)).thenReturn(Optional.of(race));
        when(raceRepository.save(race)).thenReturn(race);

        RaceResponse response = raceService.updateRaceStatus(
                id,
                new RaceStatusRequest(RaceStatus.OPEN_FOR_REGISTRATION)
        );

        assertThat(response.status()).isEqualTo(RaceStatus.OPEN_FOR_REGISTRATION);
        verify(raceRepository).save(race);
    }

    @Test
    @DisplayName("rejects invalid draft to completed transition")
    void rejectsInvalidDraftToCompletedTransition() {
        UUID id = UUID.randomUUID();
        Race race = race(RaceStatus.DRAFT);
        race.setId(id);

        when(raceRepository.findById(id)).thenReturn(Optional.of(race));

        assertThatThrownBy(() -> raceService.updateRaceStatus(
                id,
                new RaceStatusRequest(RaceStatus.COMPLETED)
        ))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Invalid race status transition from DRAFT to COMPLETED");
    }

    @Test
    @DisplayName("cancels draft race")
    void cancelsDraftRace() {
        UUID id = UUID.randomUUID();
        Race race = race(RaceStatus.DRAFT);
        race.setId(id);

        when(raceRepository.findById(id)).thenReturn(Optional.of(race));
        when(raceRepository.save(race)).thenReturn(race);

        raceService.cancelRace(id);

        assertThat(race.getStatus()).isEqualTo(RaceStatus.CANCELLED);
        assertThat(race.getUpdatedAt()).isNotNull();
        verify(raceRepository).save(race);
    }

    @Test
    @DisplayName("cancellation is idempotent for cancelled race")
    void cancellationIsIdempotentForCancelledRace() {
        UUID id = UUID.randomUUID();
        Race race = race(RaceStatus.CANCELLED);
        race.setId(id);

        when(raceRepository.findById(id)).thenReturn(Optional.of(race));

        raceService.cancelRace(id);

        verify(raceRepository).findById(id);
    }

    @Test
    @DisplayName("rejects cancellation of completed race")
    void rejectsCancellationOfCompletedRace() {
        UUID id = UUID.randomUUID();
        Race race = race(RaceStatus.COMPLETED);
        race.setId(id);

        when(raceRepository.findById(id)).thenReturn(Optional.of(race));

        assertThatThrownBy(() -> raceService.cancelRace(id))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Completed races cannot be cancelled");
    }

    @Test
    @DisplayName("rejects cancellation of in-progress race")
    void rejectsCancellationOfInProgressRace() {
        UUID id = UUID.randomUUID();
        Race race = race(RaceStatus.IN_PROGRESS);
        race.setId(id);

        when(raceRepository.findById(id)).thenReturn(Optional.of(race));

        assertThatThrownBy(() -> raceService.cancelRace(id))
                .isInstanceOf(ConflictException.class)
                .hasMessage("In-progress races cannot be cancelled");
    }

    @Test
    @DisplayName("rejects update of terminal race")
    void rejectsUpdateOfTerminalRace() {
        UUID id = UUID.randomUUID();
        Race race = race(RaceStatus.COMPLETED);
        race.setId(id);

        when(raceRepository.findById(id)).thenReturn(Optional.of(race));

        assertThatThrownBy(() -> raceService.updateRace(id, request()))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Terminal races cannot be updated");
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
                "scheduledAt,asc"
        ))
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
                LocalDateTime.now().plusDays(4)
        );
    }

    private Race race(RaceStatus status) {
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
                .organizer(organizer())
                .registrationDeadline(LocalDateTime.now().plusDays(4))
                .createdAt(LocalDateTime.now().minusHours(1))
                .updatedAt(LocalDateTime.now().minusMinutes(5))
                .build();
    }

    private User organizer() {
        return User.builder()
                .id(UUID.randomUUID())
                .keycloakSubject("keycloak-subject")
                .username("organizer")
                .email("organizer@camel-racing.test")
                .firstName("Race")
                .lastName("Organizer")
                .enabled(true)
                .createdAt(LocalDateTime.now().minusDays(3))
                .build();
    }
}