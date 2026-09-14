package com.eia.camelracing.team.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.common.config.SecurityConfig;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.team.dto.TeamMemberResponse;
import com.eia.camelracing.team.dto.TeamRequest;
import com.eia.camelracing.team.dto.TeamResponse;
import com.eia.camelracing.team.dto.TeamSummaryResponse;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.service.TeamService;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TeamController.class)
@Import(SecurityConfig.class)
@DisplayName("Team controller")
class TeamControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private TeamService teamService;

        @MockitoBean
        private JwtDecoder jwtDecoder;

        @Nested
        @DisplayName("GET /api/teams")
        class GetTeams {

                @Test
                @DisplayName("viewer can list teams")
                void viewerCanListTeams() throws Exception {
                        TeamSummaryResponse team = summaryResponse();
                        PageResponse<TeamSummaryResponse> pageResponse = new PageResponse<>(
                                        List.of(team),
                                        0,
                                        10,
                                        1,
                                        1,
                                        true,
                                        true,
                                        false);

                        when(teamService.getTeams(
                                        null,
                                        null,
                                        null,
                                        null,
                                        null)).thenReturn(pageResponse);

                        mockMvc.perform(get("/api/teams")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.content", hasSize(1)))
                                        .andExpect(jsonPath("$.content[0].name", is("The Five Exceptions")))
                                        .andExpect(jsonPath("$.page", is(0)))
                                        .andExpect(jsonPath("$.totalElements", is(1)));
                }

                @Test
                @DisplayName("returns unauthorized without token")
                void returnsUnauthorizedWithoutToken() throws Exception {
                        mockMvc.perform(get("/api/teams"))
                                        .andExpect(status().isUnauthorized());
                }
        }

        @Nested
        @DisplayName("POST /api/teams")
        class CreateTeam {

                @Test
                @DisplayName("administrator can create team")
                void administratorCanCreateTeam() throws Exception {
                        when(teamService.createTeam(any(TeamRequest.class)))
                                        .thenReturn(teamResponseWithoutMembers());

                        mockMvc.perform(post("/api/teams")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isCreated())
                                        .andExpect(jsonPath("$.name", is("The Five Exceptions")))
                                        .andExpect(jsonPath("$.status", is("ACTIVE")))
                                        .andExpect(jsonPath("$.members", hasSize(0)));
                }

                @Test
                @DisplayName("viewer cannot create team")
                void viewerCannotCreateTeam() throws Exception {
                        mockMvc.perform(post("/api/teams")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isForbidden());
                }

                @Test
                @DisplayName("returns bad request when name is blank")
                void returnsBadRequestWhenNameIsBlank() throws Exception {
                        mockMvc.perform(post("/api/teams")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                                "name": "",
                                                                "description": "A team of resilient dwarfs",
                                                                "coachName": "Captain Cache"
                                                        }
                                                        """))
                                        .andExpect(status().isBadRequest());
                }

                @Test
                @DisplayName("returns conflict when team name is duplicated")
                void returnsConflictWhenTeamNameIsDuplicated() throws Exception {
                        when(teamService.createTeam(any(TeamRequest.class)))
                                        .thenThrow(new ConflictException("Team name is already in use"));

                        mockMvc.perform(post("/api/teams")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isConflict());
                }
        }

        @Nested
        @DisplayName("GET /api/teams/{id}")
        class GetTeamById {

                @Test
                @DisplayName("organizer can get team detail")
                void organizerCanGetTeamDetail() throws Exception {
                        UUID id = UUID.randomUUID();

                        when(teamService.getTeamById(id)).thenReturn(teamResponseWithMember(id));

                        mockMvc.perform(get("/api/teams/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.id", is(id.toString())))
                                        .andExpect(jsonPath("$.members", hasSize(1)))
                                        .andExpect(jsonPath("$.members[0].nickname", is("TinyDocker")));
                }
        }

        @Nested
        @DisplayName("PUT /api/teams/{id}")
        class UpdateTeam {

                @Test
                @DisplayName("administrator can update team")
                void administratorCanUpdateTeam() throws Exception {
                        UUID id = UUID.randomUUID();

                        when(teamService.updateTeam(eq(id), any(TeamRequest.class)))
                                        .thenReturn(teamResponseWithMember(id));

                        mockMvc.perform(put("/api/teams/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.name", is("The Five Exceptions")));
                }

                @Test
                @DisplayName("viewer cannot update team")
                void viewerCannotUpdateTeam() throws Exception {
                        UUID id = UUID.randomUUID();

                        mockMvc.perform(put("/api/teams/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isForbidden());
                }
        }

        @Nested
        @DisplayName("POST /api/teams/{teamId}/members/{competitorId}")
        class AddMember {

                @Test
                @DisplayName("administrator can add member")
                void administratorCanAddMember() throws Exception {
                        UUID teamId = UUID.randomUUID();
                        UUID competitorId = UUID.randomUUID();

                        when(teamService.addMember(teamId, competitorId))
                                        .thenReturn(teamResponseWithMember(teamId));

                        mockMvc.perform(post("/api/teams/" + teamId + "/members/" + competitorId)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.members", hasSize(1)));
                }

                @Test
                @DisplayName("viewer cannot add member")
                void viewerCannotAddMember() throws Exception {
                        UUID teamId = UUID.randomUUID();
                        UUID competitorId = UUID.randomUUID();

                        mockMvc.perform(post("/api/teams/" + teamId + "/members/" + competitorId)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isForbidden());
                }
        }

        @Nested
        @DisplayName("DELETE /api/teams/{teamId}/members/{competitorId}")
        class RemoveMember {

                @Test
                @DisplayName("administrator can remove member")
                void administratorCanRemoveMember() throws Exception {
                        UUID teamId = UUID.randomUUID();
                        UUID competitorId = UUID.randomUUID();

                        doNothing().when(teamService).removeMember(teamId, competitorId);

                        mockMvc.perform(delete("/api/teams/" + teamId + "/members/" + competitorId)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                                        .andExpect(status().isNoContent());
                }
        }

        @Nested
        @DisplayName("DELETE /api/teams/{id}")
        class DeactivateTeam {

                @Test
                @DisplayName("administrator can deactivate team")
                void administratorCanDeactivateTeam() throws Exception {
                        UUID id = UUID.randomUUID();

                        doNothing().when(teamService).deactivateTeam(id);

                        mockMvc.perform(delete("/api/teams/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                                        .andExpect(status().isNoContent());
                }
        }

        private TeamSummaryResponse summaryResponse() {
                return new TeamSummaryResponse(
                                UUID.randomUUID(),
                                "The Five Exceptions",
                                "A team of resilient dwarfs",
                                "Captain Cache",
                                TeamStatus.ACTIVE,
                                LocalDateTime.now(),
                                0,
                                0);
        }

        private TeamResponse teamResponseWithoutMembers() {
                return new TeamResponse(
                                UUID.randomUUID(),
                                "The Five Exceptions",
                                "A team of resilient dwarfs",
                                "Captain Cache",
                                TeamStatus.ACTIVE,
                                LocalDateTime.now(),
                                0,
                                0,
                                List.of());
        }

        private TeamResponse teamResponseWithMember(UUID id) {
                TeamMemberResponse member = new TeamMemberResponse(
                                UUID.randomUUID(),
                                "Tiny Docker",
                                "TinyDocker",
                                CompetitorType.DWARF,
                                LocalDateTime.now().minusDays(1));

                return new TeamResponse(
                                id,
                                "The Five Exceptions",
                                "A team of resilient dwarfs",
                                "Captain Cache",
                                TeamStatus.ACTIVE,
                                LocalDateTime.now().minusDays(2),
                                0,
                                0,
                                List.of(member));
        }

        private String validRequestJson() {
                return """
                                {
                                        "name": "The Five Exceptions",
                                        "description": "A team of resilient dwarfs",
                                        "coachName": "Captain Cache"
                                }
                                """;
        }
}