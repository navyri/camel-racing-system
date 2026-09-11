package com.eia.camelracing.result.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.common.config.SecurityConfig;
import com.eia.camelracing.result.dto.RaceResultRequest;
import com.eia.camelracing.result.dto.RaceResultResponse;
import com.eia.camelracing.result.dto.RaceResultUpdateRequest;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.result.service.RaceResultService;

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

@WebMvcTest(RaceResultController.class)
@Import(SecurityConfig.class)
@DisplayName("Race result controller")
class RaceResultControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RaceResultService resultService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Nested
    @DisplayName("GET /api/races/{raceId}/results")
    class GetResultsByRaceId {

        @Test
        @DisplayName("viewer can list results")
        void viewerCanListResults() throws Exception {
            UUID raceId = UUID.randomUUID();

            when(resultService.getResultsByRaceId(raceId))
                    .thenReturn(List.of(response(raceId)));

            mockMvc.perform(get("/api/races/" + raceId + "/results")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].raceId", is(raceId.toString())))
                    .andExpect(jsonPath("$[0].status", is("FINISHED")))
                    .andExpect(jsonPath("$[0].finalPosition", is(1)));
        }

        @Test
        @DisplayName("returns unauthorized without token")
        void returnsUnauthorizedWithoutToken() throws Exception {
            UUID raceId = UUID.randomUUID();

            mockMvc.perform(get("/api/races/" + raceId + "/results"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/results/{id}")
    class GetResultById {

        @Test
        @DisplayName("viewer can get result by id")
        void viewerCanGetResultById() throws Exception {
            UUID resultId = UUID.randomUUID();
            UUID raceId = UUID.randomUUID();

            when(resultService.getResultById(resultId))
                    .thenReturn(responseWithId(resultId, raceId));

            mockMvc.perform(get("/api/results/" + resultId)
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(resultId.toString())))
                    .andExpect(jsonPath("$.raceId", is(raceId.toString())))
                    .andExpect(jsonPath("$.status", is("FINISHED")))
                    .andExpect(jsonPath("$.finalPosition", is(1)));

            verify(resultService).getResultById(resultId);
        }
    }

    @Nested
    @DisplayName("POST /api/races/{raceId}/results")
    class CreateResult {

        @Test
        @DisplayName("organizer can record result")
        void organizerCanRecordResult() throws Exception {
            UUID raceId = UUID.randomUUID();

            when(resultService.createResult(
                    eq(raceId),
                    any(RaceResultRequest.class))).thenReturn(response(raceId));

            mockMvc.perform(post("/api/races/" + raceId + "/results")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                    .contentType("application/json")
                    .content(validCreateRequestJson()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.raceId", is(raceId.toString())))
                    .andExpect(jsonPath("$.status", is("FINISHED")))
                    .andExpect(jsonPath("$.finalPosition", is(1)))
                    .andExpect(jsonPath("$.completionTimeSeconds", is(187)));

            verify(resultService).createResult(
                    eq(raceId),
                    any(RaceResultRequest.class));
        }

        @Test
        @DisplayName("viewer cannot record result")
        void viewerCannotRecordResult() throws Exception {
            UUID raceId = UUID.randomUUID();

            mockMvc.perform(post("/api/races/" + raceId + "/results")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER")))
                    .contentType("application/json")
                    .content(validCreateRequestJson()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns bad request when result status is missing")
        void returnsBadRequestWhenResultStatusIsMissing() throws Exception {
            UUID raceId = UUID.randomUUID();

            mockMvc.perform(post("/api/races/" + raceId + "/results")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                    .contentType("application/json")
                    .content("""
                            {
                                "registrationId": "11111111-1111-1111-1111-111111111111",
                                "finalPosition": 1,
                                "completionTimeSeconds": 187,
                                "penaltyTimeSeconds": 0
                            }
                            """))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("PUT /api/results/{id}")
    class UpdateResult {

        @Test
        @DisplayName("organizer can update result")
        void organizerCanUpdateResult() throws Exception {
            UUID resultId = UUID.randomUUID();
            UUID raceId = UUID.randomUUID();

            when(resultService.updateResult(
                    eq(resultId),
                    any(RaceResultUpdateRequest.class))).thenReturn(responseWithId(resultId, raceId));

            mockMvc.perform(put("/api/results/" + resultId)
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                    .contentType("application/json")
                    .content(validUpdateRequestJson()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(resultId.toString())))
                    .andExpect(jsonPath("$.raceId", is(raceId.toString())))
                    .andExpect(jsonPath("$.status", is("FINISHED")))
                    .andExpect(jsonPath("$.finalPosition", is(1)));

            verify(resultService).updateResult(
                    eq(resultId),
                    any(RaceResultUpdateRequest.class));
        }

        @Test
        @DisplayName("viewer cannot update result")
        void viewerCannotUpdateResult() throws Exception {
            UUID resultId = UUID.randomUUID();

            mockMvc.perform(put("/api/results/" + resultId)
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER")))
                    .contentType("application/json")
                    .content(validUpdateRequestJson()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns bad request when final position is zero")
        void returnsBadRequestWhenFinalPositionIsZero() throws Exception {
            UUID resultId = UUID.randomUUID();

            mockMvc.perform(put("/api/results/" + resultId)
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                    .contentType("application/json")
                    .content("""
                            {
                                "finalPosition": 0,
                                "completionTimeSeconds": 187,
                                "penaltyTimeSeconds": 0,
                                "status": "FINISHED"
                            }
                            """))
                    .andExpect(status().isBadRequest());
        }
    }

    private RaceResultResponse response(UUID raceId) {
        return responseWithId(UUID.randomUUID(), raceId);
    }

    private RaceResultResponse responseWithId(UUID resultId, UUID raceId) {
        return new RaceResultResponse(
                resultId,
                raceId,
                "Result Test Race",
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                "Tiny Docker",
                "TinyDocker",
                null,
                null,
                1,
                1,
                187L,
                0L,
                ResultStatus.FINISHED,
                "Clean finish",
                UUID.randomUUID(),
                "organizer",
                LocalDateTime.now());
    }

    private String validCreateRequestJson() {
        return """
                {
                    "registrationId": "11111111-1111-1111-1111-111111111111",
                    "finalPosition": 1,
                    "completionTimeSeconds": 187,
                    "penaltyTimeSeconds": 0,
                    "status": "FINISHED",
                    "notes": "Clean finish"
                }
                """;
    }

    private String validUpdateRequestJson() {
        return """
                {
                    "finalPosition": 1,
                    "completionTimeSeconds": 187,
                    "penaltyTimeSeconds": 0,
                    "status": "FINISHED",
                    "notes": "Corrected finish"
                }
                """;
    }
}