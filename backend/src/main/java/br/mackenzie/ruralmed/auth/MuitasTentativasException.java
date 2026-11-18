package br.mackenzie.ruralmed.auth;

/** Login bloqueado temporariamente depois de varias senhas erradas seguidas. */
public class MuitasTentativasException extends RuntimeException {
    public MuitasTentativasException(String mensagem) {
        super(mensagem);
    }
}
