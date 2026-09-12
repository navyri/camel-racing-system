package com.eia.camelracing.standing.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.eia.camelracing.common.config.SecurityConfig;
import com.eia.camelracing.standing.dto.CompetitorStandingResponse;
import com.eia.camelracing.standing.dto.StandingsResponse;
import com.eia.camelracing.standing.dto.TeamStandingResponse;
import com.eia.camelracing.standing.service.StandingService;

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

@WebMvcTest(StandingController.class)
@Import(SecurityConfig.class)
@DisplayName("Standing controller")
class StandingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StandingService standingService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Nested
    @DisplayName("GET /api/standings")
    class GetStandings {

        @Test
        @DisplayName("administrator can get complete standings")
        void administratorCanGetCompleteStandings() throws Exception {
            StandingsResponse response = standingsResponse();

            when(standingService.getStandings()).thenReturn(response);

            mockMvc.perform(get("/api/standings")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.competitors", hasSize(1)))
                    .andExpect(jsonPath("$.teams", hasSize(1)))
                    .andExpect(jsonPath("$.competitors[0].points", is(10)))
                    .andExpect(jsonPath("$.teams[0].points", is(7)));

            verify(standingService).getStandings();
        }

        @Test
        @DisplayName("organizer can get complete standings")
        void organizerCanGetCompleteStandings() throws Exception {
            when(standingService.getStandings()).thenReturn(standingsResponse());

            mockMvc.perform(get("/api/standings")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                    .andExpect(status().isOk());

            verify(standingService).getStandings();
        }

        @Test
        @DisplayName("viewer can get complete standings")
        void viewerCanGetCompleteStandings() throws Exception {
            when(standingService.getStandings()).thenReturn(standingsResponse());

            mockMvc.perform(get("/api/standings")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER"))))
                    .andExpect(status().isOk());

            verify(standingService).getStandings();
        }

        @Test
        @DisplayName("returns empty competitor and team lists")
        void returnsEmptyCompetitorAndTeamLists() throws Exception {
            when(standingService.getStandings())
                    .thenReturn(new StandingsResponse(List.of(), List.of()));

            mockMvc.perform(get("/api/standings")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.competitors", hasSize(0)))
                    .andExpect(jsonPath("$.teams", hasSize(0)));

            verify(standingService).getStandings();
        }

        @Test
        @DisplayName("returns unauthorized without token")
        void returnsUnauthorizedWithoutToken() throws Exception {
            mockMvc.perform(get("/api/standings"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/standings/competitors")
    class GetCompetitorStandings {

        @Test
        @DisplayName("administrator can get competitor standings")
        void administratorCanGetCompetitorStandings() throws Exception {
            UUID competitorId = UUID.randomUUID();

            when(standingService.getCompetitorStandings())
                    .thenReturn(List.of(
                            new CompetitorStandingResponse(
                                    competitorId,
                                    "Desert Star",
                                    "desert-star",
                                    17)));

            mockMvc.perform(get("/api/standings/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].competitorId", is(competitorId.toString())))
                    .andExpect(jsonPath("$[0].name", is("Desert Star")))
                    .andExpect(jsonPath("$[0].nickname", is("desert-star")))
                    .andExpect(jsonPath("$[0].points", is(17)));

            verify(standingService).getCompetitorStandings();
        }

        @Test
        @DisplayName("organizer can get competitor standings")
        void organizerCanGetCompetitorStandings() throws Exception {
            when(standingService.getCompetitorStandings()).thenReturn(List.of());

            mockMvc.perform(get("/api/standings/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(standingService).getCompetitorStandings();
        }

        @Test
        @DisplayName("viewer can get competitor standings")
        void viewerCanGetCompetitorStandings() throws Exception {
            when(standingService.getCompetitorStandings()).thenReturn(List.of());

            mockMvc.perform(get("/api/standings/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(standingService).getCompetitorStandings();
        }

        @Test
        @DisplayName("returns unauthorized without token")
        void returnsUnauthorizedWithoutToken() throws Exception {
            mockMvc.perform(get("/api/standings/competitors"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/standings/teams")
    class GetTeamStandings {

        @Test
        @DisplayName("administrator can get team standings")
        void administratorCanGetTeamStandings() throws Exception {
            UUID teamId = UUID.randomUUID();

            when(standingService.getTeamStandings())
                    .thenReturn(List.of(
                            new TeamStandingResponse(
                                    teamId,
                                    "Sand Riders",
                                    15)));

            mockMvc.perform(get("/api/standings/teams")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].teamId", is(teamId.toString())))
                    .andExpect(jsonPath("$[0].name", is("Sand Riders")))
                    .andExpect(jsonPath("$[0].points", is(15)));

            verify(standingService).getTeamStandings();
        }

        @Test
        @DisplayName("organizer can get team standings")
        void organizerCanGetTeamStandings() throws Exception {
            when(standingService.getTeamStandings()).thenReturn(List.of());

            mockMvc.perform(get("/api/standings/teams")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(standingService).getTeamStandings();
        }

        @Test
        @DisplayName("viewer can get team standings")
        void viewerCanGetTeamStandings() throws Exception {
            when(standingService.getTeamStandings()).thenReturn(List.of());

            mockMvc.perform(get("/api/standings/teams")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(standingService).getTeamStandings();
        }

        @Test
        @DisplayName("returns unauthorized without token")
        void returnsUnauthorizedWithoutToken() throws Exception {
            mockMvc.perform(get("/api/standings/teams"))
                    .andExpect(status().isUnauthorized());
        }
    }

    private StandingsResponse standingsResponse() {
        return new StandingsResponse(
                List.of(
                        new CompetitorStandingResponse(
                                UUID.randomUUID(),
                                "Desert Star",
                                "desert-star",
                                10)),
                List.of(
                        new TeamStandingResponse(
                                UUID.randomUUID(),
                                "Sand Riders",
                                7)));
    }
}