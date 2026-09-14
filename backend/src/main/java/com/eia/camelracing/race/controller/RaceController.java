package com.eia.camelracing.race.controller;

import java.util.List;
import java.util.UUID;

import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.race.dto.RaceRequest;
import com.eia.camelracing.race.dto.RaceResponse;
import com.eia.camelracing.race.dto.RaceStatusRequest;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.race.service.RaceService;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/races")
@RequiredArgsConstructor
@Tag(name = "Races", description = "Race management")
public class RaceController {

        private final RaceService raceService;

        @PostMapping
        @Operation(summary = "Create a race")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Race created"),
                        @ApiResponse(responseCode = "400", description = "Invalid request data"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<RaceResponse> createRace(
                        @Valid @RequestBody RaceRequest request) {
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(raceService.createRace(request));
        }

        @GetMapping
        @Operation(summary = "List races with filters and pagination")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Races retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<PageResponse<RaceResponse>> getRaces(
                        @RequestParam(required = false) RaceStatus status,
                        @RequestParam(required = false) RaceType raceType,
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) Integer page,
                        @RequestParam(required = false) Integer size,
                        @RequestParam(required = false) String sort) {
                return ResponseEntity.ok(raceService.getRaces(
                                status,
                                raceType,
                                search,
                                page,
                                size,
                                sort));
        }

        @GetMapping("/upcoming")
        @Operation(summary = "List upcoming races")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Upcoming races retrieved"),
                        @ApiResponse(responseCode = "400", description = "Invalid limit"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<List<RaceResponse>> getUpcomingRaces(
                        @RequestParam(required = false) Integer limit) {
                return ResponseEntity.ok(raceService.getUpcomingRaces(limit));
        }

        @GetMapping("/{id}")
        @Operation(summary = "Get a race by id")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Race retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Race not found")
        })
        public ResponseEntity<RaceResponse> getRaceById(
                        @PathVariable UUID id) {
                return ResponseEntity.ok(raceService.getRaceById(id));
        }

        @PutMapping("/{id}")
        @Operation(summary = "Update a race")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Race updated"),
                        @ApiResponse(responseCode = "400", description = "Invalid request data"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Race not found"),
                        @ApiResponse(responseCode = "409", description = "Terminal race cannot be updated")
        })
        public ResponseEntity<RaceResponse> updateRace(
                        @PathVariable UUID id,
                        @Valid @RequestBody RaceRequest request) {
                return ResponseEntity.ok(raceService.updateRace(id, request));
        }

        @PatchMapping("/{id}/status")
        @Operation(summary = "Update race status")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Race status updated"),
                        @ApiResponse(responseCode = "400", description = "Invalid request data"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Race not found"),
                        @ApiResponse(responseCode = "409", description = "Invalid race status transition")
        })
        public ResponseEntity<RaceResponse> updateRaceStatus(
                        @PathVariable UUID id,
                        @Valid @RequestBody RaceStatusRequest request) {
                return ResponseEntity.ok(raceService.updateRaceStatus(id, request));
        }

        @DeleteMapping("/{id}")
        @Operation(summary = "Cancel a race")
        @ApiResponses({
                        @ApiResponse(responseCode = "204", description = "Race cancelled"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Race not found"),
                        @ApiResponse(responseCode = "409", description = "Race cannot be cancelled")
        })
        public ResponseEntity<Void> cancelRace(
                        @PathVariable UUID id) {
                raceService.cancelRace(id);
                return ResponseEntity.noContent().build();
        }
}