package com.eia.camelracing.race.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.common.config.SecurityConfig;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.race.dto.RaceRequest;
import com.eia.camelracing.race.dto.RaceResponse;
import com.eia.camelracing.race.dto.RaceStatusRequest;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.race.service.RaceService;

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

@WebMvcTest(RaceController.class)
@Import(SecurityConfig.class)
@DisplayName("Race controller")
class RaceControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private RaceService raceService;

        @MockitoBean
        private JwtDecoder jwtDecoder;

        @Nested
        @DisplayName("GET /api/races")
        class GetRaces {

                @Test
                @DisplayName("viewer can list races")
                void viewerCanListRaces() throws Exception {
                        RaceResponse race = response();
                        PageResponse<RaceResponse> pageResponse = new PageResponse<>(
                                        List.of(race),
                                        0,
                                        10,
                                        1,
                                        1,
                                        true,
                                        true,
                                        false);

                        when(raceService.getRaces(
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null)).thenReturn(pageResponse);

                        mockMvc.perform(get("/api/races")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.content", hasSize(1)))
                                        .andExpect(jsonPath("$.content[0].name", is("The Great Mixed Race")))
                                        .andExpect(jsonPath("$.page", is(0)));
                }

                @Test
                @DisplayName("returns unauthorized without token")
                void returnsUnauthorizedWithoutToken() throws Exception {
                        mockMvc.perform(get("/api/races"))
                                        .andExpect(status().isUnauthorized());
                }
        }

        @Nested
        @DisplayName("POST /api/races")
        class CreateRace {

                @Test
                @DisplayName("organizer can create race")
                void organizerCanCreateRace() throws Exception {
                        when(raceService.createRace(any(RaceRequest.class)))
                                        .thenReturn(response());

                        mockMvc.perform(post("/api/races")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isCreated())
                                        .andExpect(jsonPath("$.name", is("The Great Mixed Race")))
                                        .andExpect(jsonPath("$.status", is("DRAFT")))
                                        .andExpect(jsonPath("$.organizerUsername", is("organizer")));
                }

                @Test
                @DisplayName("viewer cannot create race")
                void viewerCannotCreateRace() throws Exception {
                        mockMvc.perform(post("/api/races")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isForbidden());
                }

                @Test
                @DisplayName("returns bad request when distance is invalid")
                void returnsBadRequestWhenDistanceIsInvalid() throws Exception {
                        mockMvc.perform(post("/api/races")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                                "name": "The Great Mixed Race",
                                                                "description": "A mixed academic race",
                                                                "scheduledAt": "2030-08-25T10:00:00",
                                                                "startLocation": "EIA Start",
                                                                "finishLocation": "EIA Finish",
                                                                "distanceMeters": 0,
                                                                "maxParticipants": 10,
                                                                "raceType": "MIXED",
                                                                "registrationDeadline": "2030-08-24T10:00:00"
                                                        }
                                                        """))
                                        .andExpect(status().isBadRequest());
                }

                @Test
                @DisplayName("returns bad request when maximum participants is below two")
                void returnsBadRequestWhenMaximumParticipantsIsBelowTwo() throws Exception {
                        mockMvc.perform(post("/api/races")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content(requestJsonWithMaximumParticipants(1)))
                                        .andExpect(status().isBadRequest());
                }
        }

        @Nested
        @DisplayName("GET /api/races/{id}")
        class GetRaceById {

                @Test
                @DisplayName("viewer can get race detail")
                void viewerCanGetRaceDetail() throws Exception {
                        UUID id = UUID.randomUUID();

                        when(raceService.getRaceById(id)).thenReturn(responseWithId(id));

                        mockMvc.perform(get("/api/races/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.id", is(id.toString())))
                                        .andExpect(jsonPath("$.raceType", is("MIXED")));
                }
        }

        @Nested
        @DisplayName("PUT /api/races/{id}")
        class UpdateRace {

                @Test
                @DisplayName("administrator can update race")
                void administratorCanUpdateRace() throws Exception {
                        UUID id = UUID.randomUUID();

                        when(raceService.updateRace(eq(id), any(RaceRequest.class)))
                                        .thenReturn(responseWithId(id));

                        mockMvc.perform(put("/api/races/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.name", is("The Great Mixed Race")));
                }

                @Test
                @DisplayName("organizer can update race")
                void organizerCanUpdateRace() throws Exception {
                        UUID id = UUID.randomUUID();

                        when(raceService.updateRace(eq(id), any(RaceRequest.class)))
                                        .thenReturn(responseWithId(id));

                        mockMvc.perform(put("/api/races/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isOk());
                }

                @Test
                @DisplayName("viewer cannot update race")
                void viewerCannotUpdateRace() throws Exception {
                        UUID id = UUID.randomUUID();

                        mockMvc.perform(put("/api/races/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER")))
                                        .contentType("application/json")
                                        .content(validRequestJson()))
                                        .andExpect(status().isForbidden());
                }

                @Test
                @DisplayName("returns bad request when maximum participants is below two")
                void returnsBadRequestWhenMaximumParticipantsIsBelowTwo() throws Exception {
                        UUID id = UUID.randomUUID();

                        mockMvc.perform(put("/api/races/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content(requestJsonWithMaximumParticipants(1)))
                                        .andExpect(status().isBadRequest());
                }
        }

        @Nested
        @DisplayName("PATCH /api/races/{id}/status")
        class UpdateRaceStatus {

                @Test
                @DisplayName("organizer can update race status")
                void organizerCanUpdateRaceStatus() throws Exception {
                        UUID id = UUID.randomUUID();

                        when(raceService.updateRaceStatus(
                                        eq(id),
                                        any(RaceStatusRequest.class))).thenReturn(responseWithId(id));

                        mockMvc.perform(patch("/api/races/" + id + "/status")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                                "status": "OPEN_FOR_REGISTRATION"
                                                        }
                                                        """))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.status", is("DRAFT")));
                }
        }

        @Nested
        @DisplayName("DELETE /api/races/{id}")
        class CancelRace {

                @Test
                @DisplayName("organizer can cancel race")
                void organizerCanCancelRace() throws Exception {
                        UUID id = UUID.randomUUID();

                        doNothing().when(raceService).cancelRace(id);

                        mockMvc.perform(delete("/api/races/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                                        .andExpect(status().isNoContent());
                }

                @Test
                @DisplayName("viewer cannot cancel race")
                void viewerCannotCancelRace() throws Exception {
                        UUID id = UUID.randomUUID();

                        mockMvc.perform(delete("/api/races/" + id)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isForbidden());
                }
        }

        private RaceResponse response() {
                return responseWithId(UUID.randomUUID());
        }

        private RaceResponse responseWithId(UUID id) {
                return new RaceResponse(
                                id,
                                "The Great Mixed Race",
                                "A mixed academic race",
                                LocalDateTime.now().plusDays(5),
                                "EIA Start",
                                "EIA Finish",
                                new BigDecimal("1000.00"),
                                10,
                                RaceType.MIXED,
                                RaceStatus.DRAFT,
                                UUID.randomUUID(),
                                "organizer",
                                LocalDateTime.now().plusDays(4),
                                LocalDateTime.now(),
                                LocalDateTime.now());
        }

        private String validRequestJson() {
                return requestJsonWithMaximumParticipants(10);
        }

        private String requestJsonWithMaximumParticipants(int maxParticipants) {
                return """
                                {
                                        "name": "The Great Mixed Race",
                                        "description": "A mixed academic race",
                                        "scheduledAt": "2030-08-25T10:00:00",
                                        "startLocation": "EIA Start",
                                        "finishLocation": "EIA Finish",
                                        "distanceMeters": 1000,
                                        "maxParticipants": %d,
                                        "raceType": "MIXED",
                                        "registrationDeadline": "2030-08-24T10:00:00"
                                }
                                """.formatted(maxParticipants);
        }
}