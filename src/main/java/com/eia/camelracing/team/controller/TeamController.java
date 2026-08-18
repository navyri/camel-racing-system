package com.eia.camelracing.team.controller;

import java.util.UUID;

import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.team.dto.TeamRequest;
import com.eia.camelracing.team.dto.TeamResponse;
import com.eia.camelracing.team.dto.TeamSummaryResponse;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.service.TeamService;

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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Tag(name = "Teams", description = "Team management")
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    @Operation(summary = "Create a team")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Team created"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "409", description = "Team name already exists")
    })
    public ResponseEntity<TeamResponse> createTeam(
            @Valid @RequestBody TeamRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamService.createTeam(request));
    }

    @GetMapping
    @Operation(summary = "List teams with filters and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Teams retrieved"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<PageResponse<TeamSummaryResponse>> getTeams(
            @RequestParam(required = false) TeamStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(teamService.getTeams(
                status,
                search,
                page,
                size,
                sort
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a team by id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Team retrieved"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Team not found")
    })
    public ResponseEntity<TeamResponse> getTeamById(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(teamService.getTeamById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a team")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Team updated"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Team not found"),
            @ApiResponse(responseCode = "409", description = "Team name already exists")
    })
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable UUID id,
            @Valid @RequestBody TeamRequest request
    ) {
        return ResponseEntity.ok(teamService.updateTeam(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deactivate a team")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Team deactivated"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Team not found")
    })
    public ResponseEntity<Void> deactivateTeam(
            @PathVariable UUID id
    ) {
        teamService.deactivateTeam(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{teamId}/members/{competitorId}")
    @Operation(summary = "Add an active competitor to a team")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Member added"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Team or competitor not found"),
            @ApiResponse(responseCode = "409", description = "Membership rule violation")
    })
    public ResponseEntity<TeamResponse> addMember(
            @PathVariable UUID teamId,
            @PathVariable UUID competitorId
    ) {
        return ResponseEntity.ok(teamService.addMember(teamId, competitorId));
    }

    @DeleteMapping("/{teamId}/members/{competitorId}")
    @Operation(summary = "Remove an active team member")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Member removed"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "Team or active member not found")
    })
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID teamId,
            @PathVariable UUID competitorId
    ) {
        teamService.removeMember(teamId, competitorId);
        return ResponseEntity.noContent().build();
    }
}