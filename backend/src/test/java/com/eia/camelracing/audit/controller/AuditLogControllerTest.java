package com.eia.camelracing.audit.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.audit.dto.AuditLogResponse;
import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.config.SecurityConfig;
import com.eia.camelracing.common.dto.PageResponse;

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

@WebMvcTest(AuditLogController.class)
@Import(SecurityConfig.class)
@DisplayName("Audit log controller")
class AuditLogControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private AuditLogService auditLogService;

        @MockitoBean
        private JwtDecoder jwtDecoder;

        @Nested
        @DisplayName("GET /api/audit-logs")
        class GetAuditLogs {

                @Test
                @DisplayName("administrator can list audit logs")
                void administratorCanListAuditLogs() throws Exception {
                        AuditLogResponse auditLog = auditLogResponse();
                        PageResponse<AuditLogResponse> response = new PageResponse<>(
                                        List.of(auditLog),
                                        0,
                                        10,
                                        1,
                                        1,
                                        true,
                                        true,
                                        false);

                        when(auditLogService.getAuditLogs(null, null)).thenReturn(response);

                        mockMvc.perform(get("/api/audit-logs")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.content", hasSize(1)))
                                        .andExpect(jsonPath("$.content[0].action", is("RACE_CANCELLED")))
                                        .andExpect(jsonPath("$.content[0].entityType", is("RACE")))
                                        .andExpect(jsonPath("$.page", is(0)))
                                        .andExpect(jsonPath("$.size", is(10)))
                                        .andExpect(jsonPath("$.totalElements", is(1)))
                                        .andExpect(jsonPath("$.first", is(true)))
                                        .andExpect(jsonPath("$.last", is(true)))
                                        .andExpect(jsonPath("$.empty", is(false)));

                        verify(auditLogService).getAuditLogs(null, null);
                }

                @Test
                @DisplayName("administrator can request pagination")
                void administratorCanRequestPagination() throws Exception {
                        PageResponse<AuditLogResponse> response = new PageResponse<>(
                                        List.of(),
                                        1,
                                        5,
                                        0,
                                        0,
                                        false,
                                        true,
                                        true);

                        when(auditLogService.getAuditLogs(1, 5)).thenReturn(response);

                        mockMvc.perform(get("/api/audit-logs")
                                        .param("page", "1")
                                        .param("size", "5")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.content", hasSize(0)))
                                        .andExpect(jsonPath("$.page", is(1)))
                                        .andExpect(jsonPath("$.size", is(5)))
                                        .andExpect(jsonPath("$.empty", is(true)));

                        verify(auditLogService).getAuditLogs(1, 5);
                }

                @Test
                @DisplayName("organizer receives structured forbidden response")
                void organizerReceivesStructuredForbiddenResponse() throws Exception {
                        mockMvc.perform(get("/api/audit-logs")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                                        .andExpect(status().isForbidden())
                                        .andExpect(content().contentTypeCompatibleWith("application/json"))
                                        .andExpect(jsonPath("$.status", is(403)))
                                        .andExpect(jsonPath("$.error", is("Forbidden")))
                                        .andExpect(jsonPath(
                                                        "$.message",
                                                        is("You do not have permission to access this resource")))
                                        .andExpect(jsonPath("$.path", is("/api/audit-logs")))
                                        .andExpect(jsonPath("$.timestamp", notNullValue()))
                                        .andExpect(jsonPath("$.validationErrors").doesNotExist());
                }

                @Test
                @DisplayName("viewer receives structured forbidden response")
                void viewerReceivesStructuredForbiddenResponse() throws Exception {
                        mockMvc.perform(get("/api/audit-logs")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isForbidden())
                                        .andExpect(content().contentTypeCompatibleWith("application/json"))
                                        .andExpect(jsonPath("$.status", is(403)))
                                        .andExpect(jsonPath("$.error", is("Forbidden")))
                                        .andExpect(jsonPath(
                                                        "$.message",
                                                        is("You do not have permission to access this resource")))
                                        .andExpect(jsonPath("$.path", is("/api/audit-logs")))
                                        .andExpect(jsonPath("$.timestamp", notNullValue()))
                                        .andExpect(jsonPath("$.validationErrors").doesNotExist());
                }

                @Test
                @DisplayName("returns structured unauthorized response without token")
                void returnsStructuredUnauthorizedResponseWithoutToken() throws Exception {
                        mockMvc.perform(get("/api/audit-logs"))
                                        .andExpect(status().isUnauthorized())
                                        .andExpect(content().contentTypeCompatibleWith("application/json"))
                                        .andExpect(jsonPath("$.status", is(401)))
                                        .andExpect(jsonPath("$.error", is("Unauthorized")))
                                        .andExpect(jsonPath(
                                                        "$.message",
                                                        is("Authentication is required to access this resource")))
                                        .andExpect(jsonPath("$.path", is("/api/audit-logs")))
                                        .andExpect(jsonPath("$.timestamp", notNullValue()))
                                        .andExpect(jsonPath("$.validationErrors").doesNotExist());
                }
        }

        private AuditLogResponse auditLogResponse() {
                return new AuditLogResponse(
                                UUID.randomUUID(),
                                UUID.randomUUID(),
                                "administrator",
                                "RACE_CANCELLED",
                                "RACE",
                                UUID.randomUUID().toString(),
                                "Race cancelled",
                                "status=OPEN_FOR_REGISTRATION",
                                "status=CANCELLED",
                                LocalDateTime.now());
        }
}