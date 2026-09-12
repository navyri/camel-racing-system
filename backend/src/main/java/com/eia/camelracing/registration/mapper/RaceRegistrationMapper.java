package com.eia.camelracing.registration.mapper;

import com.eia.camelracing.registration.dto.RaceRegistrationResponse;
import com.eia.camelracing.registration.entity.RaceRegistration;

public final class RaceRegistrationMapper {

    private RaceRegistrationMapper() {
    }

    public static RaceRegistrationResponse toResponse(RaceRegistration registration) {
        if (registration == null) {
            return null;
        }

        return new RaceRegistrationResponse(
                registration.getId(),
                registration.getRace().getId(),
                registration.getCompetitor() == null ? null : registration.getCompetitor().getId(),
                registration.getCompetitor() == null ? null : registration.getCompetitor().getName(),
                registration.getCompetitor() == null ? null : registration.getCompetitor().getNickname(),
                registration.getTeam() == null ? null : registration.getTeam().getId(),
                registration.getTeam() == null ? null : registration.getTeam().getName(),
                registration.getRegisteredAt(),
                registration.getStatus(),
                registration.getStartingPosition(),
                registration.getValidationNotes(),
                registration.getRegisteredBy().getId(),
                registration.getRegisteredBy().getUsername()
        );
    }
}