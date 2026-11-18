package br.mackenzie.ruralmed.comum;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * O front é um app React de página única. Quem abre /acs ou /entrar direto no navegador
 * (ou recarrega a página) recebe o index.html, e o React decide qual tela mostrar.
 */
@Controller
public class SpaController {

    @GetMapping({"/entrar", "/acs", "/ubs", "/medico", "/gestor"})
    public String app() {
        return "forward:/index.html";
    }
}
