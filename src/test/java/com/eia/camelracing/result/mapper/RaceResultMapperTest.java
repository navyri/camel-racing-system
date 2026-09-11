package com.eia.camelracing.result.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.result.dto.RaceResultResponse;
import com.eia.camelracing.result.entity.RaceResult;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Race result mapper")
class RaceResultMapperTest {

    @Test
    @DisplayName("maps individual result to response")
    void mapsIndividualResultToResponse() {
        UUID resultId = UUID.randomUUID();
        UUID raceId = UUID.randomUUID();
        UUID registrationId = UUID.randomUUID();
        UUID competitorId = UUID.randomUUID();

        User organizer = user("organizer");
        Race race = race(raceId, organizer);
        Competitor competitor = competitor(competitorId);
        RaceRegistration registration = RaceRegistration.builder()
                .id(registrationId)
                .race(race)
                .competitor(competitor)
                .registeredAt(LocalDateTime.now().minusMinutes(20))
                .status(RegistrationStatus.APPROVED)
                .startingPosition(1)
                .registeredBy(organizer)
                .build();
        LocalDateTime recordedAt = LocalDateTime.now().minusMinutes(5);

        RaceResult result = RaceResult.builder()
                .id(resultId)
                .registration(registration)
                .startingPosition(1)
                .finalPosition(1)
                .completionTime(Duration.ofSeconds(187))
                .penaltyTime(Duration.ofSeconds(3))
                .status(ResultStatus.FINISHED)
                .notes("Clean finish")
                .recordedBy(organizer)
                .recordedAt(recordedAt)
                .build();

        RaceResultResponse response = RaceResultMapper.toResponse(result);

        assertThat(response.id()).isEqualTo(resultId);
        assertThat(response.raceId()).isEqualTo(raceId);
        assertThat(response.raceName()).isEqualTo("Mapper Test Race");
        assertThat(response.registrationId()).isEqualTo(registrationId);
        assertThat(response.competitorId()).isEqualTo(competitorId);
        assertThat(response.competitorName()).isEqualTo("Tiny Docker");
        assertThat(response.competitorNickname()).isEqualTo("TinyDocker");
        assertThat(response.teamId()).isNull();
        assertThat(response.teamName()).isNull();
        assertThat(response.startingPosition()).isEqualTo(1);
        assertThat(response.finalPosition()).isEqualTo(1);
        assertThat(response.completionTimeSeconds()).isEqualTo(187L);
        assertThat(response.penaltyTimeSeconds()).isEqualTo(3L);
        assertThat(response.status()).isEqualTo(ResultStatus.FINISHED);
        assertThat(response.notes()).isEqualTo("Clean finish");
        assertThat(response.recordedByUserId()).isEqualTo(organizer.getId());
        assertThat(response.recordedByUsername()).isEqualTo("organizer");
        assertThat(response.recordedAt()).isEqualTo(recordedAt);
    }

    @Test
    @DisplayName("maps team result to response")
    void mapsTeamResultToResponse() {
        UUID resultId = UUID.randomUUID();
        UUID raceId = UUID.randomUUID();
        UUID registrationId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();

        User organizer = user("organizer");
        Race race = race(raceId, organizer);
        Team team = team(teamId);
        RaceRegistration registration = RaceRegistration.builder()
                .id(registrationId)
                .race(race)
                .team(team)
                .registeredAt(LocalDateTime.now().minusMinutes(20))
                .status(RegistrationStatus.APPROVED)
                .startingPosition(2)
                .registeredBy(organizer)
                .build();
        LocalDateTime recordedAt = LocalDateTime.now().minusMinutes(5);

        RaceResult result = RaceResult.builder()
                .id(resultId)
                .registration(registration)
                .startingPosition(2)
                .finalPosition(null)
                .completionTime(Duration.ZERO)
                .penaltyTime(Duration.ZERO)
                .status(ResultStatus.DID_NOT_START)
                .notes("Participant did not arrive")
                .recordedBy(organizer)
                .recordedAt(recordedAt)
                .build();

        RaceResultResponse response = RaceResultMapper.toResponse(result);

        assertThat(response.id()).isEqualTo(resultId);
        assertThat(response.raceId()).isEqualTo(raceId);
        assertThat(response.raceName()).isEqualTo("Mapper Test Race");
        assertThat(response.registrationId()).isEqualTo(registrationId);
        assertThat(response.competitorId()).isNull();
        assertThat(response.competitorName()).isNull();
        assertThat(response.competitorNickname()).isNull();
        assertThat(response.teamId()).isEqualTo(teamId);
        assertThat(response.teamName()).isEqualTo("Moonlight Relay");
        assertThat(response.startingPosition()).isEqualTo(2);
        assertThat(response.finalPosition()).isNull();
        assertThat(response.completionTimeSeconds()).isZero();
        assertThat(response.penaltyTimeSeconds()).isZero();
        assertThat(response.status()).isEqualTo(ResultStatus.DID_NOT_START);
        assertThat(response.notes()).isEqualTo("Participant did not arrive");
        assertThat(response.recordedByUserId()).isEqualTo(organizer.getId());
        assertThat(response.recordedByUsername()).isEqualTo("organizer");
        assertThat(response.recordedAt()).isEqualTo(recordedAt);
    }

    @Test
    @DisplayName("returns null for null result")
    void returnsNullForNullResult() {
        assertThat(RaceResultMapper.toResponse(null)).isNull();
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
                .status(RaceStatus.IN_PROGRESS)
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