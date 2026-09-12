package com.eia.camelracing.race.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.user.entity.User;
import com.eia.camelracing.user.repository.UserRepository;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

@Tag("integracion")
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RaceRepositoryTest {

    @Autowired
    private RaceRepository raceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    private LocalDateTime baseTime;

    @BeforeEach
    void setUp() {
        baseTime = LocalDateTime.of(2026, 9, 11, 8, 0);
    }

    @Test
    void shouldReturnPageWhenOptionalTextSearchIsNull() {
        User organizer = userRepository.save(createUser());

        Race savedRace = raceRepository.save(
                Race.builder()
                        .name("Desert Dawn Race")
                        .description("Race used for optional search regression test")
                        .scheduledAt(baseTime.plusDays(1))
                        .startLocation("Desert Gate")
                        .finishLocation("Oasis Finish")
                        .distanceMeters(new BigDecimal("5000.00"))
                        .maxParticipants(20)
                        .raceType(RaceType.MIXED)
                        .status(RaceStatus.OPEN_FOR_REGISTRATION)
                        .organizer(organizer)
                        .registrationDeadline(baseTime.plusHours(12))
                        .createdAt(baseTime)
                        .updatedAt(baseTime)
                        .build());

        entityManager.flush();
        entityManager.clear();

        Page<Race> page = raceRepository.findAllByFilters(
                null,
                null,
                null,
                PageRequest.of(0, 10));

        assertThat(page).isNotNull();
        assertThat(page.getContent())
                .extracting(Race::getId)
                .contains(savedRace.getId());
    }

    private User createUser() {
        return User.builder()
                .keycloakSubject("race-repository-test-" + UUID.randomUUID())
                .username("race-repository-user-" + UUID.randomUUID())
                .email("race-repository-" + UUID.randomUUID() + "@example.com")
                .firstName("Race")
                .lastName("Tester")
                .enabled(true)
                .createdAt(baseTime)
                .build();
    }
}