package com.eia.camelracing.race.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.race.dto.RaceRequest;
import com.eia.camelracing.race.dto.RaceResponse;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Race mapper")
class RaceMapperTest {

    @Test
    @DisplayName("maps request to draft race entity")
    void mapsRequestToDraftRaceEntity() {
        User organizer = organizer();

        Race race = RaceMapper.toEntity(request(), organizer);

        assertThat(race.getId()).isNull();
        assertThat(race.getName()).isEqualTo("The Great Mixed Race");
        assertThat(race.getRaceType()).isEqualTo(RaceType.MIXED);
        assertThat(race.getStatus()).isEqualTo(RaceStatus.DRAFT);
        assertThat(race.getOrganizer()).isEqualTo(organizer);
        assertThat(race.getDistanceMeters()).isEqualByComparingTo("1000.00");
    }

    @Test
    @DisplayName("updates editable fields without changing controlled fields")
    void updatesEditableFieldsWithoutChangingControlledFields() {
        UUID id = UUID.randomUUID();
        User organizer = organizer();
        LocalDateTime createdAt = LocalDateTime.now().minusDays(2);
        LocalDateTime updatedAt = LocalDateTime.now().minusDays(1);

        Race race = Race.builder()
                .id(id)
                .name("Old Race")
                .description("Old Description")
                .scheduledAt(LocalDateTime.now().plusDays(10))
                .startLocation("Old Start")
                .finishLocation("Old Finish")
                .distanceMeters(new BigDecimal("500.00"))
                .maxParticipants(5)
                .raceType(RaceType.INDIVIDUAL)
                .status(RaceStatus.OPEN_FOR_REGISTRATION)
                .organizer(organizer)
                .registrationDeadline(LocalDateTime.now().plusDays(9))
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();

        RaceMapper.updateEntity(race, request());

        assertThat(race.getId()).isEqualTo(id);
        assertThat(race.getStatus()).isEqualTo(RaceStatus.OPEN_FOR_REGISTRATION);
        assertThat(race.getOrganizer()).isEqualTo(organizer);
        assertThat(race.getCreatedAt()).isEqualTo(createdAt);
        assertThat(race.getUpdatedAt()).isEqualTo(updatedAt);
        assertThat(race.getName()).isEqualTo("The Great Mixed Race");
        assertThat(race.getRaceType()).isEqualTo(RaceType.MIXED);
        assertThat(race.getMaxParticipants()).isEqualTo(10);
    }

    @Test
    @DisplayName("maps race to flat response")
    void mapsRaceToFlatResponse() {
        User organizer = organizer();
        UUID raceId = UUID.randomUUID();

        Race race = Race.builder()
                .id(raceId)
                .name("The Great Mixed Race")
                .description("A mixed academic race")
                .scheduledAt(LocalDateTime.now().plusDays(5))
                .startLocation("EIA Start")
                .finishLocation("EIA Finish")
                .distanceMeters(new BigDecimal("1000.00"))
                .maxParticipants(10)
                .raceType(RaceType.MIXED)
                .status(RaceStatus.DRAFT)
                .organizer(organizer)
                .registrationDeadline(LocalDateTime.now().plusDays(4))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        RaceResponse response = RaceMapper.toResponse(race);

        assertThat(response.id()).isEqualTo(raceId);
        assertThat(response.organizerId()).isEqualTo(organizer.getId());
        assertThat(response.organizerUsername()).isEqualTo("organizer");
        assertThat(response.status()).isEqualTo(RaceStatus.DRAFT);
        assertThat(response.raceType()).isEqualTo(RaceType.MIXED);
    }

    @Test
    @DisplayName("returns null for null entity input")
    void returnsNullForNullEntityInput() {
        assertThat(RaceMapper.toEntity(null, organizer())).isNull();
        assertThat(RaceMapper.toResponse(null)).isNull();
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

    private User organizer() {
        return User.builder()
                .id(UUID.randomUUID())
                .keycloakSubject("keycloak-subject")
                .username("organizer")
                .email("organizer@camel-racing.test")
                .firstName("Race")
                .lastName("Organizer")
                .enabled(true)
                .createdAt(LocalDateTime.now().minusDays(5))
                .build();
    }
}