package com.eia.camelracing.race.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.eia.camelracing.race.entity.RaceType;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RaceRequest(
        @NotBlank(message = "Race name is required") @Size(max = 150, message = "Race name must not exceed 150 characters") String name,

        @NotBlank(message = "Description is required") @Size(max = 1000, message = "Description must not exceed 1000 characters") String description,

        @NotNull(message = "Scheduled date is required") @Future(message = "Scheduled date must be in the future") LocalDateTime scheduledAt,

        @NotBlank(message = "Start location is required") @Size(max = 200, message = "Start location must not exceed 200 characters") String startLocation,

        @NotBlank(message = "Finish location is required") @Size(max = 200, message = "Finish location must not exceed 200 characters") String finishLocation,

        @NotNull(message = "Distance is required") @DecimalMin(value = "0.01", message = "Distance must be greater than zero") BigDecimal distanceMeters,

        @Min(value = 2, message = "Maximum participants must be at least 2") int maxParticipants,

        @NotNull(message = "Race type is required") RaceType raceType,

        @NotNull(message = "Registration deadline is required") @Future(message = "Registration deadline must be in the future") LocalDateTime registrationDeadline) {

    @AssertTrue(message = "Registration deadline must be before the scheduled date")
    public boolean hasValidRegistrationDeadline() {
        if (registrationDeadline == null || scheduledAt == null) {
            return true;
        }

        return registrationDeadline.isBefore(scheduledAt);
    }
}