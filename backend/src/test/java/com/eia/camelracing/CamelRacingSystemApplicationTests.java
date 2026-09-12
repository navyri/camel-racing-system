package com.eia.camelracing;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@Tag("integracion")
@SpringBootTest
@ActiveProfiles("test")
class CamelRacingSystemApplicationTests {

    @Test
    void contextLoads() {
    }
}