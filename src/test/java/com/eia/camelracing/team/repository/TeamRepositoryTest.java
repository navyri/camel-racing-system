package com.eia.camelracing.team.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;

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
class TeamRepositoryTest {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private EntityManager entityManager;

    private LocalDateTime baseTime;

    @BeforeEach
    void setUp() {
        baseTime = LocalDateTime.of(2026, 9, 11, 8, 0);
    }

    @Test
    void shouldReturnPageWhenOptionalTextSearchIsNull() {
        Team savedTeam = teamRepository.save(
                Team.builder()
                        .name("Sand Riders " + UUID.randomUUID())
                        .description("Team used for optional search regression test")
                        .coachName("Repository Coach")
                        .status(TeamStatus.ACTIVE)
                        .createdAt(baseTime)
                        .victories(0)
                        .defeats(0)
                        .build());

        entityManager.flush();
        entityManager.clear();

        Page<Team> page = teamRepository.findAllByFilters(
                null,
                null,
                PageRequest.of(0, 10));

        assertThat(page).isNotNull();
        assertThat(page.getContent())
                .extracting(Team::getId)
                .contains(savedTeam.getId());
    }
}