package com.eia.camelracing.competitor.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eia.camelracing.competitor.dto.CompetitorRequest;
import com.eia.camelracing.competitor.dto.CompetitorResponse;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Competitor mapper")
class CompetitorMapperTest {

    @Test
    @DisplayName("maps request to entity with active status")
    void mapsRequestToEntityWithActiveStatus() {
        CompetitorRequest request = requestWithDateOfBirth();

        Competitor competitor = CompetitorMapper.toEntity(request);

        assertThat(competitor.getId()).isNull();
        assertThat(competitor.getName()).isEqualTo("Byte");
        assertThat(competitor.getNickname()).isEqualTo("ByteTheCamel");
        assertThat(competitor.getCompetitorType()).isEqualTo(CompetitorType.CAMEL);
        assertThat(competitor.getDateOfBirth()).isEqualTo(LocalDate.of(2016, 5, 20));
        assertThat(competitor.getApproximateAge()).isNull();
        assertThat(competitor.getStatus()).isEqualTo(CompetitorStatus.ACTIVE);
    }

    @Test
    @DisplayName("updates editable fields without changing controlled fields")
    void updatesEditableFieldsWithoutChangingControlledFields() {
        UUID id = UUID.randomUUID();
        LocalDateTime registrationDate = LocalDateTime.now().minusDays(2);

        Competitor competitor = Competitor.builder()
                .id(id)
                .name("Byte")
                .nickname("ByteTheCamel")
                .competitorType(CompetitorType.CAMEL)
                .dateOfBirth(LocalDate.of(2016, 5, 20))
                .weightKg(new BigDecimal("400.00"))
                .heightCm(new BigDecimal("220.00"))
                .origin("Colombia")
                .status(CompetitorStatus.INJURED)
                .registrationDate(registrationDate)
                .victories(4)
                .defeats(1)
                .completedRaces(5)
                .build();

        CompetitorMapper.updateEntity(competitor, requestWithApproximateAge());

        assertThat(competitor.getId()).isEqualTo(id);
        assertThat(competitor.getRegistrationDate()).isEqualTo(registrationDate);
        assertThat(competitor.getStatus()).isEqualTo(CompetitorStatus.INJURED);
        assertThat(competitor.getVictories()).isEqualTo(4);
        assertThat(competitor.getDefeats()).isEqualTo(1);
        assertThat(competitor.getCompletedRaces()).isEqualTo(5);
        assertThat(competitor.getName()).isEqualTo("Tiny Docker");
        assertThat(competitor.getApproximateAge()).isEqualTo(21);
        assertThat(competitor.getDateOfBirth()).isNull();
    }

    @Test
    @DisplayName("maps entity to flat response")
    void mapsEntityToFlatResponse() {
        UUID id = UUID.randomUUID();
        LocalDateTime registrationDate = LocalDateTime.now();

        Competitor competitor = Competitor.builder()
                .id(id)
                .name("Byte")
                .nickname("ByteTheCamel")
                .competitorType(CompetitorType.CAMEL)
                .dateOfBirth(LocalDate.of(2016, 5, 20))
                .weightKg(new BigDecimal("400.00"))
                .heightCm(new BigDecimal("220.00"))
                .origin("Colombia")
                .status(CompetitorStatus.ACTIVE)
                .registrationDate(registrationDate)
                .victories(3)
                .defeats(2)
                .completedRaces(5)
                .build();

        CompetitorResponse response = CompetitorMapper.toResponse(competitor);

        assertThat(response.id()).isEqualTo(id);
        assertThat(response.nickname()).isEqualTo("ByteTheCamel");
        assertThat(response.status()).isEqualTo(CompetitorStatus.ACTIVE);
        assertThat(response.victories()).isEqualTo(3);
        assertThat(response.defeats()).isEqualTo(2);
        assertThat(response.completedRaces()).isEqualTo(5);
    }

    @Test
    @DisplayName("returns null for null input")
    void returnsNullForNullInput() {
        assertThat(CompetitorMapper.toEntity(null)).isNull();
        assertThat(CompetitorMapper.toResponse(null)).isNull();
    }

    private CompetitorRequest requestWithDateOfBirth() {
        return new CompetitorRequest(
                "Byte",
                "ByteTheCamel",
                CompetitorType.CAMEL,
                LocalDate.of(2016, 5, 20),
                null,
                new BigDecimal("400.00"),
                new BigDecimal("220.00"),
                "Colombia"
        );
    }

    private CompetitorRequest requestWithApproximateAge() {
        return new CompetitorRequest(
                "Tiny Docker",
                "TinyDocker",
                CompetitorType.DWARF,
                null,
                21,
                new BigDecimal("50.00"),
                new BigDecimal("120.00"),
                "Colombia"
        );
    }
}