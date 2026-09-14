package com.eia.camelracing.competitor.mapper;

import com.eia.camelracing.competitor.dto.CompetitorRequest;
import com.eia.camelracing.competitor.dto.CompetitorResponse;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;

public final class CompetitorMapper {

    private CompetitorMapper() {
    }

    public static Competitor toEntity(CompetitorRequest request) {
        if (request == null) {
            return null;
        }

        return Competitor.builder()
                .name(request.name())
                .nickname(request.nickname())
                .competitorType(request.competitorType())
                .dateOfBirth(request.dateOfBirth())
                .approximateAge(request.approximateAge())
                .weightKg(request.weightKg())
                .heightCm(request.heightCm())
                .origin(request.origin())
                .status(CompetitorStatus.ACTIVE)
                .build();
    }

    public static void updateEntity(Competitor competitor, CompetitorRequest request) {
        competitor.setName(request.name());
        competitor.setNickname(request.nickname());
        competitor.setCompetitorType(request.competitorType());
        competitor.setDateOfBirth(request.dateOfBirth());
        competitor.setApproximateAge(request.approximateAge());
        competitor.setWeightKg(request.weightKg());
        competitor.setHeightCm(request.heightCm());
        competitor.setOrigin(request.origin());
    }

    public static CompetitorResponse toResponse(Competitor competitor) {
        if (competitor == null) {
            return null;
        }

        return new CompetitorResponse(
                competitor.getId(),
                competitor.getName(),
                competitor.getNickname(),
                competitor.getCompetitorType(),
                competitor.getDateOfBirth(),
                competitor.getApproximateAge(),
                competitor.getWeightKg(),
                competitor.getHeightCm(),
                competitor.getOrigin(),
                competitor.getStatus(),
                competitor.getRegistrationDate(),
                competitor.getVictories(),
                competitor.getDefeats(),
                competitor.getCompletedRaces()
        );
    }
}