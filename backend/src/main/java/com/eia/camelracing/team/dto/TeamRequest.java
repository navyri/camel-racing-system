package com.eia.camelracing.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamRequest(
        @NotBlank(message = "Team name is required")
        @Size(max = 150, message = "Team name must not exceed 150 characters")
        String name,

        @NotBlank(message = "Description is required")
        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        @NotBlank(message = "Coach name is required")
        @Size(max = 150, message = "Coach name must not exceed 150 characters")
        String coachName
) {
}