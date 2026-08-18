package com.eia.camelracing.competitor.controller;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.hasSize;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.common.config.SecurityConfig;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.competitor.dto.CompetitorRequest;
import com.eia.camelracing.competitor.dto.CompetitorResponse;
import com.eia.camelracing.competitor.dto.CompetitorStatusRequest;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.competitor.service.CompetitorService;

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

@WebMvcTest(CompetitorController.class)
@Import(SecurityConfig.class)
@DisplayName("Competitor controller")
class CompetitorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompetitorService competitorService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Nested
    @DisplayName("GET /api/competitors")
    class GetCompetitors {

        @Test
        @DisplayName("viewer can list competitors")
        void viewerCanListCompetitors() throws Exception {
            CompetitorResponse competitor = response();
            PageResponse<CompetitorResponse> pageResponse = new PageResponse<>(
                    List.of(competitor),
                    0,
                    10,
                    1,
                    1,
                    true,
                    true,
                    false);

            when(competitorService.getCompetitors(
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null)).thenReturn(pageResponse);

            mockMvc.perform(get("/api/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].nickname", is("ByteTheCamel")))
                    .andExpect(jsonPath("$.page", is(0)))
                    .andExpect(jsonPath("$.totalElements", is(1)));
        }

        @Test
        @DisplayName("returns 401 when request has no token")
        void returnsUnauthorizedWithoutToken() throws Exception {
            mockMvc.perform(get("/api/competitors"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("POST /api/competitors")
    class CreateCompetitor {

        @Test
        @DisplayName("administrator can create competitor")
        void administratorCanCreateCompetitor() throws Exception {
            when(competitorService.createCompetitor(any(CompetitorRequest.class)))
                    .thenReturn(response());

            mockMvc.perform(post("/api/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                    .contentType("application/json")
                    .content(validRequestJson()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.nickname", is("ByteTheCamel")))
                    .andExpect(jsonPath("$.status", is("ACTIVE")));
        }

        @Test
        @DisplayName("viewer cannot create competitor")
        void viewerCannotCreateCompetitor() throws Exception {
            mockMvc.perform(post("/api/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_VIEWER")))
                    .contentType("application/json")
                    .content(validRequestJson()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("returns bad request when weight is invalid")
        void returnsBadRequestWhenWeightIsInvalid() throws Exception {
            mockMvc.perform(post("/api/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                    .contentType("application/json")
                    .content("""
                            {
                                "name": "Byte",
                                "nickname": "ByteTheCamel",
                                "competitorType": "CAMEL",
                                "dateOfBirth": "2016-05-20",
                                "weightKg": 0,
                                "heightCm": 220,
                                "origin": "Colombia"
                            }
                            """))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("returns conflict when nickname is duplicated")
        void returnsConflictWhenNicknameIsDuplicated() throws Exception {
            when(competitorService.createCompetitor(any(CompetitorRequest.class)))
                    .thenThrow(new ConflictException("Nickname is already in use"));

            mockMvc.perform(post("/api/competitors")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                    .contentType("application/json")
                    .content(validRequestJson()))
                    .andExpect(status().isConflict());
        }
    }

    @Nested
    @DisplayName("GET /api/competitors/{id}")
    class GetCompetitorById {

        @Test
        @DisplayName("returns competitor when it exists")
        void returnsCompetitorWhenItExists() throws Exception {
            UUID id = UUID.randomUUID();

            when(competitorService.getCompetitorById(id)).thenReturn(responseWithId(id));

            mockMvc.perform(get("/api/competitors/" + id)
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id", is(id.toString())))
                    .andExpect(jsonPath("$.name", is("Byte")));
        }
    }

    @Nested
    @DisplayName("PATCH /api/competitors/{id}/status")
    class UpdateStatus {

        @Test
        @DisplayName("administrator can update competitor status")
        void administratorCanUpdateCompetitorStatus() throws Exception {
            UUID id = UUID.randomUUID();

            when(competitorService.updateCompetitorStatus(
                    eq(id),
                    any(CompetitorStatusRequest.class))).thenReturn(responseWithId(id));

            mockMvc.perform(patch("/api/competitors/" + id + "/status")
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                    .contentType("application/json")
                    .content("""
                            {
                                "status": "INJURED"
                            }
                            """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("ACTIVE")));
        }
    }

    @Nested
    @DisplayName("DELETE /api/competitors/{id}")
    class RetireCompetitor {

        @Test
        @DisplayName("administrator can retire competitor")
        void administratorCanRetireCompetitor() throws Exception {
            UUID id = UUID.randomUUID();

            doNothing().when(competitorService).retireCompetitor(id);

            mockMvc.perform(delete("/api/competitors/" + id)
                    .with(jwt().authorities(
                            new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                    .andExpect(status().isNoContent());
        }
    }

    private CompetitorResponse response() {
        return responseWithId(UUID.randomUUID());
    }

    private CompetitorResponse responseWithId(UUID id) {
        return new CompetitorResponse(
                id,
                "Byte",
                "ByteTheCamel",
                CompetitorType.CAMEL,
                LocalDate.of(2016, 5, 20),
                null,
                new BigDecimal("400.00"),
                new BigDecimal("220.00"),
                "Colombia",
                CompetitorStatus.ACTIVE,
                LocalDateTime.now(),
                0,
                0,
                0);
    }

    private String validRequestJson() {
        return """
                {
                    "name": "Byte",
                    "nickname": "ByteTheCamel",
                    "competitorType": "CAMEL",
                    "dateOfBirth": "2016-05-20",
                    "weightKg": 400,
                    "heightCm": 220,
                    "origin": "Colombia"
                }
                """;
    }
}