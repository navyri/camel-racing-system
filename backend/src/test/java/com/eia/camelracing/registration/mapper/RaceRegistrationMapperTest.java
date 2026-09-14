package com.eia.camelracing.registration.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.registration.dto.RaceRegistrationResponse;
import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Race registration mapper")
class RaceRegistrationMapperTest {

    @Test
    @DisplayName("maps pending individual registration without starting position to response")
    void mapsPendingIndividualRegistrationWithoutStartingPositionToResponse() {
        UUID registrationId = UUID.randomUUID();
        UUID raceId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        User organizer = user("organizer");
        Race race = race(raceId, organizer);
        Competitor competitor = competitor(competitorId);
        LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(5);

        RaceRegistration registration = RaceRegistration.builder()
                .id(registrationId)
                .race(race)
                .competitor(competitor)
                .registeredAt(registeredAt)
                .status(RegistrationStatus.PENDING)
                .startingPosition(null)
                .validationNotes("Pending validation")
                .registeredBy(organizer)
                .build();

        RaceRegistrationResponse response = RaceRegistrationMapper.toResponse(registration);

        assertThat(response.id()).isEqualTo(registrationId);
        assertThat(response.raceId()).isEqualTo(raceId);
        assertThat(response.competitorId()).isEqualTo(competitorId);
        assertThat(response.competitorName()).isEqualTo("Tiny Docker");
        assertThat(response.competitorNickname()).isEqualTo("TinyDocker");
        assertThat(response.teamId()).isNull();
        assertThat(response.teamName()).isNull();
        assertThat(response.registeredAt()).isEqualTo(registeredAt);
        assertThat(response.status()).isEqualTo(RegistrationStatus.PENDING);
        assertThat(response.startingPosition()).isNull();
        assertThat(response.validationNotes()).isEqualTo("Pending validation");
        assertThat(response.registeredByUserId()).isEqualTo(organizer.getId());
        assertThat(response.registeredByUsername()).isEqualTo("organizer");
    }

    @Test
    @DisplayName("maps approved team registration to response")
    void mapsApprovedTeamRegistrationToResponse() {
        UUID registrationId = UUID.randomUUID();
        UUID raceId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();

        User organizer = user("organizer");
        Race race = race(raceId, organizer);
        Team team = team(teamId);
        LocalDateTime registeredAt = LocalDateTime.now().minusMinutes(5);

        RaceRegistration registration = RaceRegistration.builder()
                .id(registrationId)
                .race(race)
                .team(team)
                .registeredAt(registeredAt)
                .status(RegistrationStatus.APPROVED)
                .startingPosition(2)
                .validationNotes("Approved team")
                .registeredBy(organizer)
                .build();

        RaceRegistrationResponse response = RaceRegistrationMapper.toResponse(registration);

        assertThat(response.id()).isEqualTo(registrationId);
        assertThat(response.raceId()).isEqualTo(raceId);
        assertThat(response.competitorId()).isNull();
        assertThat(response.competitorName()).isNull();
        assertThat(response.competitorNickname()).isNull();
        assertThat(response.teamId()).isEqualTo(teamId);
        assertThat(response.teamName()).isEqualTo("Moonlight Relay");
        assertThat(response.registeredAt()).isEqualTo(registeredAt);
        assertThat(response.status()).isEqualTo(RegistrationStatus.APPROVED);
        assertThat(response.startingPosition()).isEqualTo(2);
        assertThat(response.validationNotes()).isEqualTo("Approved team");
        assertThat(response.registeredByUserId()).isEqualTo(organizer.getId());
        assertThat(response.registeredByUsername()).isEqualTo("organizer");
    }

    @Test
    @DisplayName("returns null for null registration")
    void returnsNullForNullRegistration() {
        assertThat(RaceRegistrationMapper.toResponse(null)).isNull();
    }

    private Race race(UUID id, User organizer) {
        return Race.builder()
                .id(id)
                .name("Mapper Test Race")
                .description("Race used for mapper tests")
                .scheduledAt(LocalDateTime.now().plusDays(3))
                .startLocation("Start")
                .finishLocation("Finish")
                .distanceMeters(new BigDecimal("1000.00"))
                .maxParticipants(10)
                .raceType(RaceType.MIXED)
                .status(RaceStatus.OPEN_FOR_REGISTRATION)
                .organizer(organizer)
                .registrationDeadline(LocalDateTime.now().plusDays(2))
                .createdAt(LocalDateTime.now().minusHours(1))
                .updatedAt(LocalDateTime.now().minusMinutes(5))
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
                .name("Moonlight Relay")
                .description("Team used for mapper tests")
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