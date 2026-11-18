package br.mackenzie.ruralmed.exame;

import br.mackenzie.ruralmed.auth.AuthService;
import br.mackenzie.ruralmed.comum.RegraNegocioException;
import br.mackenzie.ruralmed.triagem.Dossie;
import br.mackenzie.ruralmed.triagem.DossieRepository;
import br.mackenzie.ruralmed.usuario.Perfil;
import br.mackenzie.ruralmed.usuario.Usuario;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AnexoExameServiceTest {
    private final AnexoExameRepository anexos = mock(AnexoExameRepository.class);
    private final DossieRepository dossies = mock(DossieRepository.class);
    private final AnexoExameService service = new AnexoExameService(anexos, dossies);
    private final AuthService.Sessao sessao = new AuthService.Sessao("token", usuarioUbs(), null, null);
    private final Dossie dossie = new Dossie();

    @BeforeEach
    void preparar() {
        when(dossies.findById(3L)).thenReturn(Optional.of(dossie));
        when(anexos.save(any(AnexoExame.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void devePersistirArquivoDeExameNoDossie() {
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "resultado.pdf", "application/pdf", new byte[]{'%', 'P', 'D', 'F'});

        AnexoExame salvo = service.salvar(3L, arquivo, sessao);

        assertThat(salvo.getNomeArquivo()).isEqualTo("resultado.pdf");
        assertThat(salvo.getTipoConteudo()).isEqualTo("application/pdf");
        assertThat(salvo.getConteudo()).containsExactly((byte) '%', (byte) 'P', (byte) 'D', (byte) 'F');
        assertThat(salvo.getDossie()).isSameAs(dossie);
        verify(anexos).save(salvo);
    }

    @Test
    void deveRecusarTipoDeArquivoNaoPermitido() {
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "script.html", "text/html", new byte[]{1});

        assertThatThrownBy(() -> service.salvar(3L, arquivo, sessao))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("Formato não permitido");
        verify(anexos, never()).save(any());
    }

    @Test
    void deveRecusarArquivoDisfarcadoDePdf() {
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo", "exame.pdf", "application/pdf", "<script>alert(1)</script>".getBytes());

        assertThatThrownBy(() -> service.salvar(3L, arquivo, sessao))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("não corresponde");
        verify(anexos, never()).save(any());
    }

    @Test
    void deveReconhecerAssinaturasDeImagem() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0};
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};

        assertThat(AnexoExameService.conteudoConfereComTipo(png, "image/png")).isTrue();
        assertThat(AnexoExameService.conteudoConfereComTipo(jpeg, "image/jpeg")).isTrue();
        assertThat(AnexoExameService.conteudoConfereComTipo(png, "image/jpeg")).isFalse();
        assertThat(AnexoExameService.conteudoConfereComTipo(new byte[0], "application/pdf")).isFalse();
    }

    private static Usuario usuarioUbs() {
        Usuario usuario = new Usuario();
        usuario.setId(8L);
        usuario.setPerfil(Perfil.UBS);
        return usuario;
    }
}
