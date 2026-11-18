package br.mackenzie.ruralmed.comum;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Só na demonstração pública: todo dia, às 4h (Brasília), apaga o banco e roda as migrations
 * de novo, restaurando os dados fictícios. Assim ninguém deixa dados reais esquecidos ali.
 */
@Configuration
@Profile("demo")
@EnableScheduling
public class RestauracaoDemo {

    private static final Logger log = LoggerFactory.getLogger(RestauracaoDemo.class);

    private final Flyway flyway;

    public RestauracaoDemo(Flyway flyway) {
        this.flyway = flyway;
    }

    @Scheduled(cron = "${ruralmed.demo.restauracao}", zone = "America/Sao_Paulo")
    public void restaurar() {
        log.info("Restaurando o banco da demonstração para os dados de exemplo");
        flyway.clean();
        flyway.migrate();
    }
}
