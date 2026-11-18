package br.mackenzie.ruralmed.paciente;

import br.mackenzie.ruralmed.auth.AuthService;
import br.mackenzie.ruralmed.comum.AcessoNegadoException;
import br.mackenzie.ruralmed.triagem.DossieRepository;
import br.mackenzie.ruralmed.usuario.Perfil;
import br.mackenzie.ruralmed.usuario.Usuario;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("Quais pacientes o médico pode consultar")
class AcessoMedicoTest {
    private final DossieRepository dossies = mock(DossieRepository.class);
    private final RelogioDeTeste relogio = new RelogioDeTeste();
    private final AcessoMedico acesso = new AcessoMedico(dossies, relogio);

    private static AuthService.Sessao sessao(Perfil perfil, Long usuarioId, Long especialidadeId) {
        Usuario usuario = new Usuario();
        usuario.setId(usuarioId);
        usuario.setPerfil(perfil);
        return new AuthService.Sessao("token", usuario, null, especialidadeId);
    }

    @Test
    void liberaPacienteQueJaPassouPelaEspecialidadeDoMedico() {
        when(dossies.existsByPacienteIdAndEspecialidadeId(10L, 7L)).thenReturn(true);

        assertThatCode(() -> acesso.verificar(sessao(Perfil.MEDICO, 6L, 7L), 10L)).doesNotThrowAnyException();
    }

    @Test
    void recusaPacienteDeOutraEspecialidadeAteSerLocalizado() {
        var medico = sessao(Perfil.MEDICO, 6L, 7L);

        assertThatThrownBy(() -> acesso.verificar(medico, 10L))
                .isInstanceOf(AcessoNegadoException.class)
                .hasMessageContaining("CPF ou ID RuralMed");

        acesso.liberar(6L, 10L);
        assertThatCode(() -> acesso.verificar(medico, 10L)).doesNotThrowAnyException();
    }

    @Test
    void liberacaoValeSoParaQuemLocalizouEExpiraEmOitoHoras() {
        acesso.liberar(6L, 10L);

        assertThatThrownBy(() -> acesso.verificar(sessao(Perfil.MEDICO, 99L, 7L), 10L))
                .isInstanceOf(AcessoNegadoException.class);

        relogio.avancar(AcessoMedico.VALIDADE);
        assertThatThrownBy(() -> acesso.verificar(sessao(Perfil.MEDICO, 6L, 7L), 10L))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void naoInterfereNosOutrosPerfis() {
        assertThatCode(() -> acesso.verificar(sessao(Perfil.UBS, 1L, null), 10L)).doesNotThrowAnyException();
        verifyNoInteractions(dossies);
    }

    static class RelogioDeTeste extends Clock {
        private Instant agora = Instant.parse("2026-11-18T12:00:00Z");

        void avancar(Duration tempo) {
            agora = agora.plus(tempo);
        }

        @Override public Instant instant() { return agora; }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
    }
}
