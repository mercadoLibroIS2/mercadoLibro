package com.ingenieriaSoftware2.Mapper;

import com.ingenieriaSoftware2.DTO.Request.ReseniaRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.ReseniaResponseDTO;
import com.ingenieriaSoftware2.Entity.Resenia;
import com.ingenieriaSoftware2.Exception.Intercambio.IntercambioNoExiste;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Repository.ReseniaRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ReseniaMapper {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private IntercambioRepository intercambioRepository;

    @Autowired
    private ReseniaRepository reseniaRepository;

    public Resenia toEntity(ReseniaRequestDTO dto){
        if(dto == null){
            return null;
        }
        Resenia resenia = new Resenia();
        resenia.setAutor(usuarioRepository.findById(dto.autorId()).orElseThrow(()-> new UsuarioNoEncontrado()));
        resenia.setCalificado(usuarioRepository.findById(dto.calificado()).orElseThrow(()-> new UsuarioNoEncontrado()));
        resenia.setIntercambio(intercambioRepository.findById(dto.intercambioId()).orElseThrow(()->new IntercambioNoExiste()));
        resenia.setCalificacion(dto.calificacion());
        resenia.setComentario(dto.comentario());

        Resenia reseniaGuardada = reseniaRepository.save(resenia);

        return reseniaGuardada;
    }

    public ReseniaResponseDTO toDTO(Resenia resenia){
        ReseniaResponseDTO dto = new ReseniaResponseDTO(
                resenia.getId(),
                resenia.getIntercambio().getId(),
                resenia.getAutor().getId(),
                resenia.getCalificado().getId(),
                resenia.getCalificacion(),
                resenia.getComentario()
        );
        return dto;
    }
}
