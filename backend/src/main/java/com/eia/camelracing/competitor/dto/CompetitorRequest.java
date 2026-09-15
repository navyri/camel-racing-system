package com.eia.camelracing.competitor.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.eia.camelracing.competitor.entity.CompetitorType;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CompetitorRequest(
        @NotBlank(message = "Name is required") @Size(max = 150, message = "Name must not exceed 150 characters") String name,

        @NotBlank(message = "Nickname is required") @Size(max = 100, message = "Nickname must not exceed 100 characters") String nickname,

        @NotNull(message = "Competitor type is required") CompetitorType competitorType,

        @Past(message = "Date of birth must be in the past") LocalDate dateOfBirth,

        @Positive(message = "Approximate age must be positive") @Max(value = 150, message = "Approximate age must not exceed 150") Integer approximateAge,

        @NotNull(message = "Weight is required") @DecimalMin(value = "10.00", message = "Weight must be at least 10 kg") @DecimalMax(value = "1500.00", message = "Weight must not exceed 1500 kg") BigDecimal weightKg,

        @NotNull(message = "Height is required") @DecimalMin(value = "30.00", message = "Height must be at least 30 cm") @DecimalMax(value = "400.00", message = "Height must not exceed 400 cm") BigDecimal heightCm,

        @NotBlank(message = "Origin is required") @Size(max = 100, message = "Origin must not exceed 100 characters") String origin) {

    @AssertTrue(message = "Provide exactly one of dateOfBirth or approximateAge")
    public boolean hasExactlyOneAgeReference() {
        return (dateOfBirth == null) != (approximateAge == null);
    }
}