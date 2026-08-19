package com.eia.camelracing.registration.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.common.config.SecurityConfig;
import com.eia.camelracing.registration.dto.RaceRegistrationRequest;
import com.eia.camelracing.registration.dto.RaceRegistrationResponse;
import com.eia.camelracing.registration.dto.RegistrationRejectRequest;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.service.RaceRegistrationService;

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

@WebMvcTest(RaceRegistrationController.class)
@Import(SecurityConfig.class)
@DisplayName("Race registration controller")
class RaceRegistrationControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private RaceRegistrationService registrationService;

        @MockitoBean
        private JwtDecoder jwtDecoder;

        @Nested
        @DisplayName("GET /api/races/{raceId}/registrations")
        class GetRegistrationsByRaceId {

                @Test
                @DisplayName("viewer can list registrations")
                void viewerCanListRegistrations() throws Exception {
                        UUID raceId = UUID.randomUUID();

                        when(registrationService.getRegistrationsByRaceId(raceId))
                                        .thenReturn(List.of(response(raceId)));

                        mockMvc.perform(get("/api/races/" + raceId + "/registrations")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$", hasSize(1)))
                                        .andExpect(jsonPath("$[0].raceId", is(raceId.toString())))
                                        .andExpect(jsonPath("$[0].status", is("PENDING")));
                }

                @Test
                @DisplayName("returns unauthorized without token")
                void returnsUnauthorizedWithoutToken() throws Exception {
                        UUID raceId = UUID.randomUUID();

                        mockMvc.perform(get("/api/races/" + raceId + "/registrations"))
                                        .andExpect(status().isUnauthorized());
                }
        }

        @Nested
        @DisplayName("GET /api/registrations/{id}")
        class GetRegistrationById {

                @Test
                @DisplayName("viewer can get registration by id")
                void viewerCanGetRegistrationById() throws Exception {
                        UUID registrationId = UUID.randomUUID();
                        UUID raceId = UUID.randomUUID();

                        RaceRegistrationResponse registrationResponse = new RaceRegistrationResponse(
                                        registrationId,
                                        raceId,
                                        UUID.fromString("11111111-1111-1111-1111-111111111111"),
                                        "Tiny Docker",
                                        "TinyDocker",
                                        null,
                                        null,
                                        LocalDateTime.now(),
                                        RegistrationStatus.PENDING,
                                        1,
                                        null,
                                        UUID.randomUUID(),
                                        "organizer");

                        when(registrationService.getRegistrationById(registrationId))
                                        .thenReturn(registrationResponse);

                        mockMvc.perform(get("/api/registrations/" + registrationId)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.id", is(registrationId.toString())))
                                        .andExpect(jsonPath("$.raceId", is(raceId.toString())))
                                        .andExpect(jsonPath("$.status", is("PENDING")));

                        verify(registrationService).getRegistrationById(registrationId);
                }
        }

        @Nested
        @DisplayName("POST /api/races/{raceId}/registrations")
        class CreateRegistration {

                @Test
                @DisplayName("organizer can create registration")
                void organizerCanCreateRegistration() throws Exception {
                        UUID raceId = UUID.randomUUID();

                        when(registrationService.createRegistration(
                                        eq(raceId),
                                        any(RaceRegistrationRequest.class))).thenReturn(response(raceId));

                        mockMvc.perform(post("/api/races/" + raceId + "/registrations")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                          "competitorId": "11111111-1111-1111-1111-111111111111",
                                                          "startingPosition": 1
                                                        }
                                                        """))
                                        .andExpect(status().isCreated())
                                        .andExpect(jsonPath("$.status", is("PENDING")))
                                        .andExpect(jsonPath("$.competitorId",
                                                        is("11111111-1111-1111-1111-111111111111")));
                }

                @Test
                @DisplayName("viewer cannot create registration")
                void viewerCannotCreateRegistration() throws Exception {
                        UUID raceId = UUID.randomUUID();

                        mockMvc.perform(post("/api/races/" + raceId + "/registrations")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                          "competitorId": "11111111-1111-1111-1111-111111111111"
                                                        }
                                                        """))
                                        .andExpect(status().isForbidden());
                }

                @Test
                @DisplayName("returns bad request when participant is missing")
                void returnsBadRequestWhenParticipantIsMissing() throws Exception {
                        UUID raceId = UUID.randomUUID();

                        mockMvc.perform(post("/api/races/" + raceId + "/registrations")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                          "startingPosition": 1
                                                        }
                                                        """))
                                        .andExpect(status().isBadRequest());
                }
        }

        @Nested
        @DisplayName("PATCH /api/registrations/{id}/approve")
        class ApproveRegistration {

                @Test
                @DisplayName("organizer can approve registration")
                void organizerCanApproveRegistration() throws Exception {
                        UUID registrationId = UUID.randomUUID();
                        UUID raceId = UUID.randomUUID();

                        RaceRegistrationResponse approvedResponse = new RaceRegistrationResponse(
                                        registrationId,
                                        raceId,
                                        UUID.fromString("11111111-1111-1111-1111-111111111111"),
                                        "Tiny Docker",
                                        "TinyDocker",
                                        null,
                                        null,
                                        LocalDateTime.now(),
                                        RegistrationStatus.APPROVED,
                                        1,
                                        null,
                                        UUID.randomUUID(),
                                        "organizer");

                        when(registrationService.approveRegistration(registrationId))
                                        .thenReturn(approvedResponse);

                        mockMvc.perform(patch("/api/registrations/" + registrationId + "/approve")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.id", is(registrationId.toString())))
                                        .andExpect(jsonPath("$.raceId", is(raceId.toString())))
                                        .andExpect(jsonPath("$.status", is("APPROVED")));

                        verify(registrationService).approveRegistration(registrationId);
                }

                @Test
                @DisplayName("viewer cannot approve registration")
                void viewerCannotApproveRegistration() throws Exception {
                        UUID registrationId = UUID.randomUUID();

                        mockMvc.perform(patch("/api/registrations/" + registrationId + "/approve")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isForbidden());

                        verify(registrationService, org.mockito.Mockito.never())
                                        .approveRegistration(registrationId);
                }
        }

        @Nested
        @DisplayName("PATCH /api/registrations/{id}/reject")
        class RejectRegistration {

                @Test
                @DisplayName("organizer can reject registration with reason")
                void organizerCanRejectRegistrationWithReason() throws Exception {
                        UUID registrationId = UUID.randomUUID();
                        UUID raceId = UUID.randomUUID();
                        String reason = "Participant is not eligible";

                        RaceRegistrationResponse rejectedResponse = new RaceRegistrationResponse(
                                        registrationId,
                                        raceId,
                                        UUID.fromString("11111111-1111-1111-1111-111111111111"),
                                        "Tiny Docker",
                                        "TinyDocker",
                                        null,
                                        null,
                                        LocalDateTime.now(),
                                        RegistrationStatus.REJECTED,
                                        1,
                                        reason,
                                        UUID.randomUUID(),
                                        "organizer");

                        when(registrationService.rejectRegistration(
                                        eq(registrationId),
                                        argThat(request -> reason.equals(request.reason()))))
                                        .thenReturn(rejectedResponse);

                        mockMvc.perform(patch("/api/registrations/" + registrationId + "/reject")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                          "reason": "Participant is not eligible"
                                                        }
                                                        """))
                                        .andExpect(status().isOk())
                                        .andExpect(jsonPath("$.id", is(registrationId.toString())))
                                        .andExpect(jsonPath("$.status", is("REJECTED")))
                                        .andExpect(jsonPath("$.validationNotes", is(reason)));

                        verify(registrationService).rejectRegistration(
                                        eq(registrationId),
                                        argThat(request -> reason.equals(request.reason())));
                }

                @Test
                @DisplayName("returns bad request when rejection reason is blank")
                void returnsBadRequestWhenRejectionReasonIsBlank() throws Exception {
                        UUID registrationId = UUID.randomUUID();

                        mockMvc.perform(patch("/api/registrations/" + registrationId + "/reject")
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER")))
                                        .contentType("application/json")
                                        .content("""
                                                        {
                                                          "reason": ""
                                                        }
                                                        """))
                                        .andExpect(status().isBadRequest());

                        verify(registrationService, org.mockito.Mockito.never())
                                        .rejectRegistration(
                                                        eq(registrationId),
                                                        any(RegistrationRejectRequest.class));
                }
        }

        @Nested
        @DisplayName("DELETE /api/registrations/{id}")
        class CancelRegistration {

                @Test
                @DisplayName("organizer can cancel registration")
                void organizerCanCancelRegistration() throws Exception {
                        UUID registrationId = UUID.randomUUID();

                        mockMvc.perform(delete("/api/registrations/" + registrationId)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_RACE_ORGANIZER"))))
                                        .andExpect(status().isNoContent());

                        verify(registrationService).cancelRegistration(registrationId);
                }

                @Test
                @DisplayName("viewer cannot cancel registration")
                void viewerCannotCancelRegistration() throws Exception {
                        UUID registrationId = UUID.randomUUID();

                        mockMvc.perform(delete("/api/registrations/" + registrationId)
                                        .with(jwt().authorities(
                                                        new SimpleGrantedAuthority("ROLE_VIEWER"))))
                                        .andExpect(status().isForbidden());

                        verify(registrationService, org.mockito.Mockito.never())
                                        .cancelRegistration(registrationId);
                }
        }

        private RaceRegistrationResponse response(UUID raceId) {
                return new RaceRegistrationResponse(
                                UUID.randomUUID(),
                                raceId,
                                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                                "Tiny Docker",
                                "TinyDocker",
                                null,
                                null,
                                LocalDateTime.now(),
                                RegistrationStatus.PENDING,
                                1,
                                null,
                                UUID.randomUUID(),
                                "organizer");
        }
}