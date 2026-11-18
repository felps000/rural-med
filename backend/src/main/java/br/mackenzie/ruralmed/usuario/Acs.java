package br.mackenzie.ruralmed.usuario;

import br.mackenzie.ruralmed.cadastro.Microarea;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "acs")
public class Acs {

    @Id
    private Long usuarioId;

    @OneToOne
    @MapsId
    @JsonIgnoreProperties({"cpf", "email", "criadoEm"}) // dados pessoais de outros profissionais não saem junto com o caso
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "microarea_id")
    private Microarea microarea;

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Microarea getMicroarea() { return microarea; }
    public void setMicroarea(Microarea microarea) { this.microarea = microarea; }
}
