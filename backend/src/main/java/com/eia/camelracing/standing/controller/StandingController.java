package com.eia.camelracing.standing.controller;

import java.util.List;

import com.eia.camelracing.standing.dto.CompetitorStandingResponse;
import com.eia.camelracing.standing.dto.StandingsResponse;
import com.eia.camelracing.standing.dto.TeamStandingResponse;
import com.eia.camelracing.standing.service.StandingService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/standings")
@RequiredArgsConstructor
@Tag(name = "Standings", description = "Read-only race standings")
public class StandingController {

        private final StandingService standingService;

        @GetMapping
        @Operation(summary = "Get complete standings", description = """
                        Returns separate competitor and team standings.

                        Points are calculated from official race results only:
                        first place receives 10 points, second 7, third 5,
                        fourth 3 and fifth 1. All other final positions and
                        non-finished statuses receive 0 points.

                        Participants with at least one official result appear
                        even when their total score is 0. Participants without
                        official results do not appear.

                        Competitors are ordered by points descending, name
                        ascending, nickname ascending and id ascending.
                        Teams are ordered by points descending, name ascending
                        and id ascending.
                        """)
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Standings retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<StandingsResponse> getStandings() {
                return ResponseEntity.ok(standingService.getStandings());
        }

        @GetMapping("/competitors")
        @Operation(summary = "Get competitor standings", description = """
                        Returns standings for individual competitors only.

                        Points are calculated from finished positions one through
                        five. Results from team registrations are excluded.

                        Competitors with at least one official result appear,
                        including competitors with 0 points.

                        Ordering is points descending, name ascending, nickname
                        ascending and id ascending.
                        """)
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Competitor standings retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<List<CompetitorStandingResponse>> getCompetitorStandings() {
                return ResponseEntity.ok(standingService.getCompetitorStandings());
        }

        @GetMapping("/teams")
        @Operation(summary = "Get team standings", description = """
                        Returns standings for team registrations only.

                        Points are calculated from finished positions one through
                        five. Results from individual registrations are excluded.

                        Teams with at least one official result appear, including
                        teams with 0 points.

                        Ordering is points descending, name ascending and id
                        ascending.
                        """)
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Team standings retrieved"),
                        @ApiResponse(responseCode = "401", description = "Authentication required"),
                        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
        })
        public ResponseEntity<List<TeamStandingResponse>> getTeamStandings() {
                return ResponseEntity.ok(standingService.getTeamStandings());
        }
}
