package com.eia.camelracing.result.controller;

import java.util.List;
import java.util.UUID;

import com.eia.camelracing.result.dto.RaceResultRequest;
import com.eia.camelracing.result.dto.RaceResultResponse;
import com.eia.camelracing.result.dto.RaceResultUpdateRequest;
import com.eia.camelracing.result.service.RaceResultService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Results", description = "Race result management")
public class RaceResultController {

    private final RaceResultService resultService;

    @PostMapping("/api/races/{raceId}/results")
    @Operation(summary = "Record an official race result")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Result recorded"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Race or registration not found"),
            @ApiResponse(responseCode = "409", description = "Result conflicts with race rules")
    })
    public ResponseEntity<RaceResultResponse> createResult(
            @PathVariable UUID raceId,
            @Valid @RequestBody RaceResultRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultService.createResult(raceId, request));
    }

    @GetMapping("/api/races/{raceId}/results")
    @Operation(summary = "List official results for a race")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Results retrieved"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Race not found")
    })
    public ResponseEntity<List<RaceResultResponse>> getResultsByRaceId(
            @PathVariable UUID raceId) {
        return ResponseEntity.ok(resultService.getResultsByRaceId(raceId));
    }

    @GetMapping("/api/results/{id}")
    @Operation(summary = "Get an official result by id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Result retrieved"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Result not found")
    })
    public ResponseEntity<RaceResultResponse> getResultById(
            @PathVariable UUID id) {
        return ResponseEntity.ok(resultService.getResultById(id));
    }

    @PutMapping("/api/results/{id}")
    @Operation(summary = "Update an official race result")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Result updated"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Result not found"),
            @ApiResponse(responseCode = "409", description = "Result conflicts with race rules")
    })
    public ResponseEntity<RaceResultResponse> updateResult(
            @PathVariable UUID id,
            @Valid @RequestBody RaceResultUpdateRequest request) {
        return ResponseEntity.ok(resultService.updateResult(id, request));
    }
}