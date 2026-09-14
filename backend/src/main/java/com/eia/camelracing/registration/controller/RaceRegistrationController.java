package com.eia.camelracing.registration.controller;

import java.util.List;
import java.util.UUID;

import com.eia.camelracing.registration.dto.RaceRegistrationRequest;
import com.eia.camelracing.registration.dto.RaceRegistrationResponse;
import com.eia.camelracing.registration.dto.RegistrationApprovalRequest;
import com.eia.camelracing.registration.dto.RegistrationRejectRequest;
import com.eia.camelracing.registration.service.RaceRegistrationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Race Registrations", description = "Race registration management")
public class RaceRegistrationController {

        private final RaceRegistrationService registrationService;

        @PostMapping("/api/races/{raceId}/registrations")
        @Operation(summary = "Create a race registration")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Registration created"),
                        @ApiResponse(responseCode = "400", description = "Invalid request data"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Race or participant not found"),
                        @ApiResponse(responseCode = "409", description = "Registration rule conflict")
        })
        public ResponseEntity<RaceRegistrationResponse> createRegistration(
                        @PathVariable UUID raceId,
                        @Valid @RequestBody RaceRegistrationRequest request) {
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(registrationService.createRegistration(raceId, request));
        }

        @GetMapping("/api/races/{raceId}/registrations")
        @Operation(summary = "List registrations for a race")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Registrations retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Race not found")
        })
        public ResponseEntity<List<RaceRegistrationResponse>> getRegistrationsByRaceId(
                        @PathVariable UUID raceId) {
                return ResponseEntity.ok(registrationService.getRegistrationsByRaceId(raceId));
        }

        @GetMapping("/api/registrations/{id}")
        @Operation(summary = "Get a registration by id")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Registration retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Registration not found")
        })
        public ResponseEntity<RaceRegistrationResponse> getRegistrationById(
                        @PathVariable UUID id) {
                return ResponseEntity.ok(registrationService.getRegistrationById(id));
        }

        @PatchMapping("/api/registrations/{id}/approve")
        @Operation(summary = "Approve a pending registration and assign its starting position")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Registration approved"),
                        @ApiResponse(responseCode = "400", description = "Invalid starting position"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Registration not found"),
                        @ApiResponse(responseCode = "409", description = "Registration or race capacity conflict")
        })
        public ResponseEntity<RaceRegistrationResponse> approveRegistration(
                        @PathVariable UUID id,
                        @Valid @RequestBody RegistrationApprovalRequest request) {
                return ResponseEntity.ok(registrationService.approveRegistration(id, request));
        }

        @PatchMapping("/api/registrations/{id}/reject")
        @Operation(summary = "Reject a pending registration")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Registration rejected"),
                        @ApiResponse(responseCode = "400", description = "Invalid rejection reason"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Registration not found"),
                        @ApiResponse(responseCode = "409", description = "Invalid registration state")
        })
        public ResponseEntity<RaceRegistrationResponse> rejectRegistration(
                        @PathVariable UUID id,
                        @Valid @RequestBody RegistrationRejectRequest request) {
                return ResponseEntity.ok(registrationService.rejectRegistration(id, request));
        }

        @DeleteMapping("/api/registrations/{id}")
        @Operation(summary = "Cancel a registration")
        @ApiResponses({
                        @ApiResponse(responseCode = "204", description = "Registration cancelled"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Registration not found"),
                        @ApiResponse(responseCode = "409", description = "Invalid registration state")
        })
        public ResponseEntity<Void> cancelRegistration(
                        @PathVariable UUID id) {
                registrationService.cancelRegistration(id);
                return ResponseEntity.noContent().build();
        }
}