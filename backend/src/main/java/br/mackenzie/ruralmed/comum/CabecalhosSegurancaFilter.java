package br.mackenzie.ruralmed.comum;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Cabeçalhos HTTP que reduzem riscos comuns (clickjacking, MIME sniffing, vazamento de URL). */
@Component
public class CabecalhosSegurancaFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
            throws ServletException, IOException {
        resposta.setHeader("X-Content-Type-Options", "nosniff");
        resposta.setHeader("X-Frame-Options", "DENY");
        resposta.setHeader("Referrer-Policy", "no-referrer");
        if (requisicao.getRequestURI().startsWith("/api/")) {
            resposta.setHeader("Cache-Control", "no-store");
        }
        cadeia.doFilter(requisicao, resposta);
    }
}
