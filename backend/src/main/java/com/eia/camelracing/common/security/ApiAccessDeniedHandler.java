package com.eia.camelracing.common.security;

import java.io.IOException;
import java.time.LocalDateTime;

import com.eia.camelracing.common.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

public class ApiAccessDeniedHandler implements AccessDeniedHandler {

        private static final String MESSAGE = "You do not have permission to access this resource";

        private final ObjectMapper objectMapper;

        public ApiAccessDeniedHandler() {
                this.objectMapper = new ObjectMapper()
                                .findAndRegisterModules()
                                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        }

        @Override
        public void handle(
                        HttpServletRequest request,
                        HttpServletResponse response,
                        AccessDeniedException accessDeniedException)
                        throws IOException, ServletException {
                ErrorResponse errorResponse = new ErrorResponse(
                                LocalDateTime.now(),
                                HttpStatus.FORBIDDEN.value(),
                                HttpStatus.FORBIDDEN.getReasonPhrase(),
                                MESSAGE,
                                request.getRequestURI());

                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getOutputStream(), errorResponse);
        }
}