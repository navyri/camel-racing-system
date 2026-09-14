package com.eia.camelracing.competitor.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;

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
class CompetitorRepositoryTest {

    @Autowired
    private CompetitorRepository competitorRepository;

    @Autowired
    private EntityManager entityManager;

    private LocalDateTime baseTime;

    @BeforeEach
    void setUp() {
        baseTime = LocalDateTime.of(2026, 9, 11, 8, 0);
    }

    @Test
    void shouldReturnPageWhenOptionalOriginAndSearchAreNull() {
        Competitor savedCompetitor = competitorRepository.save(
                Competitor.builder()
                        .name("Desert Star")
                        .nickname("desert-star-" + UUID.randomUUID())
                        .competitorType(CompetitorType.CAMEL)
                        .dateOfBirth(LocalDate.of(2020, 1, 1))
                        .approximateAge(null)
                        .weightKg(new BigDecimal("450.00"))
                        .heightCm(new BigDecimal("180.00"))
                        .origin("Desert")
                        .status(CompetitorStatus.ACTIVE)
                        .registrationDate(baseTime)
                        .victories(0)
                        .defeats(0)
                        .completedRaces(0)
                        .build());

        entityManager.flush();
        entityManager.clear();

        Page<Competitor> page = competitorRepository.findAllByFilters(
                null,
                null,
                null,
                null,
                PageRequest.of(0, 10));

        assertThat(page).isNotNull();
        assertThat(page.getContent())
                .extracting(Competitor::getId)
                .contains(savedCompetitor.getId());
    }
}