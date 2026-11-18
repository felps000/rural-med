ALTER TABLE receita
    ADD COLUMN dossie_id BIGINT NULL,
    ADD COLUMN medico_id BIGINT NULL,
    ADD COLUMN nome_medicamento VARCHAR(180) NULL,
    ADD COLUMN apresentacao VARCHAR(180) NULL,
    ADD COLUMN dose VARCHAR(180) NULL,
    ADD COLUMN via_administracao VARCHAR(100) NULL,
    ADD COLUMN frequencia VARCHAR(180) NULL,
    ADD COLUMN duracao VARCHAR(180) NULL,
    ADD COLUMN orientacoes TEXT NULL;

UPDATE receita r
JOIN laudo l ON l.id = r.laudo_id
SET r.dossie_id = l.dossie_id,
    r.medico_id = l.medico_id;

-- Comandos separados: o TiDB (banco da demo online) não altera a mesma coluna duas vezes num só ALTER.
ALTER TABLE receita MODIFY dossie_id BIGINT NOT NULL;
ALTER TABLE receita MODIFY medico_id BIGINT NOT NULL;
ALTER TABLE receita MODIFY laudo_id BIGINT NULL;
ALTER TABLE receita ADD CONSTRAINT fk_receita_dossie FOREIGN KEY (dossie_id) REFERENCES dossie(id);
ALTER TABLE receita ADD CONSTRAINT fk_receita_medico FOREIGN KEY (medico_id) REFERENCES medico(usuario_id);

CREATE INDEX ix_receita_dossie ON receita (dossie_id, assinada_em);
