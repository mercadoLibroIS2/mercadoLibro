package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Mapper.PublicacionMapper;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Service.Implementations.Auxiliares.Calculadora;
import com.ingenieriaSoftware2.Service.Interfaces.PublicacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class PublicacionServiceImpl implements PublicacionService {

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private PublicacionMapper publicacionMapper;

    @Autowired
    private Calculadora calculadora;

    @Override
    public PublicacionResponseDTO publicarLibro(PublicacionRequestDTO request, String email) {
        PublicacionId publicacionId = new PublicacionId(request.isbn(),email,LocalDateTime.now());
        Publicacion publicacion = new Publicacion();
        publicacion.setId(publicacionId);
        publicacion.setEstadoFisico(request.estadoFisico());
        publicacion.setValorPuntosSolicitado(request.valorPuntosSolicitado());
        publicacion.setComentario(request.comentario());
        publicacion.setValorReferenciaCalculado(calculadora.calcular(request.isbn(), request.estadoFisico()));
        Publicacion retornar = publicacionRepository.save(publicacion);
        return publicacionMapper.toDTO(retornar);
    }


}
