package com.eia.camelracing.competitor.controller;

import java.util.UUID;

import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.competitor.dto.CompetitorRequest;
import com.eia.camelracing.competitor.dto.CompetitorResponse;
import com.eia.camelracing.competitor.dto.CompetitorStatusRequest;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.competitor.service.CompetitorService;

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
@RequestMapping("/api/competitors")
@RequiredArgsConstructor
@Tag(name = "Competitors", description = "Competitor management")
public class CompetitorController {

        private final CompetitorService competitorService;

        @PostMapping
        @Operation(summary = "Create a competitor")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Competitor created"),
                        @ApiResponse(responseCode = "400", description = "Invalid request data"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "409", description = "Nickname already exists")
        })
        public ResponseEntity<CompetitorResponse> createCompetitor(
                        @Valid @RequestBody CompetitorRequest request) {
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(competitorService.createCompetitor(request));
        }

        @GetMapping
        @Operation(summary = "List competitors with filters and pagination")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Competitors retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<PageResponse<CompetitorResponse>> getCompetitors(
                        @RequestParam(required = false) CompetitorType type,
                        @RequestParam(required = false) CompetitorStatus status,
                        @RequestParam(required = false) String origin,
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) Integer page,
                        @RequestParam(required = false) Integer size,
                        @RequestParam(required = false) String sort) {
                return ResponseEntity.ok(competitorService.getCompetitors(
                                type,
                                status,
                                origin,
                                search,
                                page,
                                size,
                                sort));
        }

        @GetMapping("/{id}")
        @Operation(summary = "Get a competitor by id")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Competitor retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Competitor not found")
        })
        public ResponseEntity<CompetitorResponse> getCompetitorById(
                        @PathVariable UUID id) {
                return ResponseEntity.ok(competitorService.getCompetitorById(id));
        }

        @PutMapping("/{id}")
        @Operation(summary = "Update a competitor")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Competitor updated"),
                        @ApiResponse(responseCode = "400", description = "Invalid request data"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Competitor not found"),
                        @ApiResponse(responseCode = "409", description = "Nickname already exists")
        })
        public ResponseEntity<CompetitorResponse> updateCompetitor(
                        @PathVariable UUID id,
                        @Valid @RequestBody CompetitorRequest request) {
                return ResponseEntity.ok(competitorService.updateCompetitor(id, request));
        }

        @PatchMapping("/{id}/status")
        @Operation(summary = "Update competitor status")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Status updated"),
                        @ApiResponse(responseCode = "400", description = "Invalid request data"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Competitor not found"),
                        @ApiResponse(responseCode = "409", description = "Invalid status transition")
        })
        public ResponseEntity<CompetitorResponse> updateCompetitorStatus(
                        @PathVariable UUID id,
                        @Valid @RequestBody CompetitorStatusRequest request) {
                return ResponseEntity.ok(competitorService.updateCompetitorStatus(id, request));
        }

        @DeleteMapping("/{id}")
        @Operation(summary = "Retire a competitor")
        @ApiResponses({
                        @ApiResponse(responseCode = "204", description = "Competitor retired"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
                        @ApiResponse(responseCode = "404", description = "Competitor not found")
        })
        public ResponseEntity<Void> retireCompetitor(
                        @PathVariable UUID id) {
                competitorService.retireCompetitor(id);
                return ResponseEntity.noContent().build();
        }
}