package com.eia.camelracing.common.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest
@Import(SecurityConfig.class)
@DisplayName("Public routes security")
class PublicRoutesSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    @DisplayName("health endpoint does not require authentication")
    void healthEndpointDoesNotRequireAuthentication() throws Exception {
        assertDoesNotRequireAuthentication("/actuator/health");
    }

    @Test
    @DisplayName("Swagger endpoint does not require authentication")
    void swaggerEndpointDoesNotRequireAuthentication() throws Exception {
        assertDoesNotRequireAuthentication("/swagger-ui/index.html");
    }

    @Test
    @DisplayName("OpenAPI endpoint does not require authentication")
    void openApiEndpointDoesNotRequireAuthentication() throws Exception {
        assertDoesNotRequireAuthentication("/v3/api-docs");
    }

    @Test
    @DisplayName("error endpoint does not require authentication")
    void errorEndpointDoesNotRequireAuthentication() throws Exception {
        assertDoesNotRequireAuthentication("/error");
    }

    private void assertDoesNotRequireAuthentication(String path) throws Exception {
        int status = mockMvc.perform(get(path))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(status)
                .as("Public route %s must not return 401 or 403", path)
                .isNotIn(401, 403);
    }
}