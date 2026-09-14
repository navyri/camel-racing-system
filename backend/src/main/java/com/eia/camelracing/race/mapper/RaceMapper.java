package com.eia.camelracing.race.mapper;

import com.eia.camelracing.race.dto.RaceRequest;
import com.eia.camelracing.race.dto.RaceResponse;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.user.entity.User;

public final class RaceMapper {

    private RaceMapper() {
    }

    public static Race toEntity(RaceRequest request, User organizer) {
        if (request == null) {
            return null;
        }

        return Race.builder()
                .name(request.name())
                .description(request.description())
                .scheduledAt(request.scheduledAt())
                .startLocation(request.startLocation())
                .finishLocation(request.finishLocation())
                .distanceMeters(request.distanceMeters())
                .maxParticipants(request.maxParticipants())
                .raceType(request.raceType())
                .status(RaceStatus.DRAFT)
                .organizer(organizer)
                .registrationDeadline(request.registrationDeadline())
                .build();
    }

    public static void updateEntity(Race race, RaceRequest request) {
        race.setName(request.name());
        race.setDescription(request.description());
        race.setScheduledAt(request.scheduledAt());
        race.setStartLocation(request.startLocation());
        race.setFinishLocation(request.finishLocation());
        race.setDistanceMeters(request.distanceMeters());
        race.setMaxParticipants(request.maxParticipants());
        race.setRaceType(request.raceType());
        race.setRegistrationDeadline(request.registrationDeadline());
    }

    public static RaceResponse toResponse(Race race) {
        if (race == null) {
            return null;
        }

        return new RaceResponse(
                race.getId(),
                race.getName(),
                race.getDescription(),
                race.getScheduledAt(),
                race.getStartLocation(),
                race.getFinishLocation(),
                race.getDistanceMeters(),
                race.getMaxParticipants(),
                race.getRaceType(),
                race.getStatus(),
                race.getOrganizer().getId(),
                race.getOrganizer().getUsername(),
                race.getRegistrationDeadline(),
                race.getCreatedAt(),
                race.getUpdatedAt()
        );
    }
}