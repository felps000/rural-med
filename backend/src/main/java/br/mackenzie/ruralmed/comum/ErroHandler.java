package br.mackenzie.ruralmed.comum;

import br.mackenzie.ruralmed.auth.MuitasTentativasException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** Toda resposta de erro da API tem o formato {"mensagem": "..."} e nunca expõe detalhes internos. */
@RestControllerAdvice
public class ErroHandler {

    private static final Logger log = LoggerFactory.getLogger(ErroHandler.class);

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<Map<String, String>> regra(RegraNegocioException e) {
        return erro(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(AcessoNegadoException.class)
    public ResponseEntity<Map<String, String>> acesso(AcessoNegadoException e) {
        return erro(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(MuitasTentativasException.class)
    public ResponseEntity<Map<String, String>> tentativas(MuitasTentativasException e) {
        return erro(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validacao(MethodArgumentNotValidException e) {
        var erroDeCampo = e.getBindingResult().getFieldError();
        String mensagem = erroDeCampo != null && erroDeCampo.getDefaultMessage() != null
                ? erroDeCampo.getDefaultMessage()
                : "Revise os dados informados";
        return erro(HttpStatus.BAD_REQUEST, mensagem);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, String>> parametroAusente(MissingServletRequestParameterException e) {
        return erro(HttpStatus.BAD_REQUEST, "Informe o parâmetro " + e.getParameterName());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> parametroInvalido(MethodArgumentTypeMismatchException e) {
        return erro(HttpStatus.BAD_REQUEST, "Valor inválido para " + e.getName());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> corpoInvalido(HttpMessageNotReadableException e) {
        return erro(HttpStatus.BAD_REQUEST, "Os dados enviados estão em um formato inválido");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> arquivoGrande(MaxUploadSizeExceededException e) {
        return erro(HttpStatus.PAYLOAD_TOO_LARGE, "O arquivo deve ter no máximo 10 MB");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> banco(DataIntegrityViolationException e) {
        return erro(HttpStatus.CONFLICT,
                "O banco recusou a operação: dado duplicado, em formato inválido ou registro em uso");
    }

    /** Último recurso: erros do Spring mantêm seu status (404, 405...); o resto vira 500 genérico. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> inesperado(Exception e) {
        if (e instanceof ErrorResponse resposta) {
            HttpStatusCode status = resposta.getStatusCode();
            return erro(status, status.value() == 404 ? "Recurso não encontrado" : "Requisição inválida");
        }
        log.error("Erro inesperado", e);
        return erro(HttpStatus.INTERNAL_SERVER_ERROR, "Erro inesperado no servidor. Tente novamente");
    }

    private static ResponseEntity<Map<String, String>> erro(HttpStatusCode status, String mensagem) {
        return ResponseEntity.status(status).body(Map.of("mensagem", mensagem));
    }
}
