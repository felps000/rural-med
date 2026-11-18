package br.mackenzie.ruralmed.auth;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Emite e valida tokens de login (JWT assinado com HMAC-SHA256).
 * O token carrega quem é o usuário; assim o login sobrevive a reinícios do servidor.
 */
@Component
public class TokenJwt {

    private static final Logger log = LoggerFactory.getLogger(TokenJwt.class);

    /** O que vem dentro do token, já conferido. */
    public record Conteudo(String id, Long usuarioId, Long microareaId, Long especialidadeId, Instant expiraEm) {
    }

    private final MACSigner assinador;
    private final MACVerifier verificador;

    public TokenJwt(@Value("${ruralmed.jwt.segredo:}") String segredo) {
        byte[] chave;
        if (segredo == null || segredo.isBlank()) {
            chave = new byte[32];
            new SecureRandom().nextBytes(chave);
            log.warn("JWT_SECRET não definido: usando chave temporária. Os logins caem quando o servidor reinicia.");
        } else {
            chave = segredo.getBytes(StandardCharsets.UTF_8);
            if (chave.length < 32) {
                throw new IllegalStateException("JWT_SECRET precisa ter pelo menos 32 caracteres");
            }
        }
        try {
            this.assinador = new MACSigner(chave);
            this.verificador = new MACVerifier(chave);
        } catch (JOSEException e) {
            throw new IllegalStateException("Chave do JWT inválida", e);
        }
    }

    public String emitir(Long usuarioId, Long microareaId, Long especialidadeId, Instant emitidoEm, Instant expiraEm) {
        JWTClaimsSet dados = new JWTClaimsSet.Builder()
                .jwtID(UUID.randomUUID().toString())
                .subject(String.valueOf(usuarioId))
                .claim("microarea", microareaId)
                .claim("especialidade", especialidadeId)
                .issueTime(Date.from(emitidoEm))
                .expirationTime(Date.from(expiraEm))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), dados);
        try {
            jwt.sign(assinador);
        } catch (JOSEException e) {
            throw new IllegalStateException("Não foi possível assinar o token", e);
        }
        return jwt.serialize();
    }

    /** Devolve o conteúdo se a assinatura confere; null se o token for inválido ou adulterado. */
    public Conteudo ler(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            SignedJWT jwt = SignedJWT.parse(token.trim());
            if (!JWSAlgorithm.HS256.equals(jwt.getHeader().getAlgorithm()) || !jwt.verify(verificador)) return null;
            JWTClaimsSet dados = jwt.getJWTClaimsSet();
            if (dados.getExpirationTime() == null || dados.getSubject() == null) return null;
            return new Conteudo(dados.getJWTID(), Long.valueOf(dados.getSubject()),
                    dados.getLongClaim("microarea"), dados.getLongClaim("especialidade"),
                    dados.getExpirationTime().toInstant());
        } catch (ParseException | JOSEException | NumberFormatException e) {
            return null;
        }
    }
}
