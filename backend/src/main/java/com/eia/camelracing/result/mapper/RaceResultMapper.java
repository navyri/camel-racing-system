package com.eia.camelracing.result.mapper;

import java.time.Duration;

import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.result.dto.RaceResultResponse;
import com.eia.camelracing.result.entity.RaceResult;

public final class RaceResultMapper {

    private RaceResultMapper() {
    }

    public static RaceResultResponse toResponse(RaceResult result) {
        if (result == null) {
            return null;
        }

        RaceRegistration registration = result.getRegistration();

        return new RaceResultResponse(
                result.getId(),
                registration.getRace().getId(),
                registration.getRace().getName(),
                registration.getId(),
                registration.getCompetitor() == null ? null : registration.getCompetitor().getId(),
                registration.getCompetitor() == null ? null : registration.getCompetitor().getName(),
                registration.getCompetitor() == null ? null : registration.getCompetitor().getNickname(),
                registration.getTeam() == null ? null : registration.getTeam().getId(),
                registration.getTeam() == null ? null : registration.getTeam().getName(),
                result.getStartingPosition(),
                result.getFinalPosition(),
                toSeconds(result.getCompletionTime()),
                toSeconds(result.getPenaltyTime()),
                result.getStatus(),
                result.getNotes(),
                result.getRecordedBy().getId(),
                result.getRecordedBy().getUsername(),
                result.getRecordedAt());
    }

    private static Long toSeconds(Duration duration) {
        return duration == null ? null : duration.toSeconds();
    }
}