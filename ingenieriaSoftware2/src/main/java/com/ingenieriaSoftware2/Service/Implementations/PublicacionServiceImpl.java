package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.PublicacionRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.PublicacionResponseDTO;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Exception.Libro.LibroNoExisteException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoExisteException;
import com.ingenieriaSoftware2.Mapper.PublicacionMapper;
import com.ingenieriaSoftware2.Repository.LibroRepository;
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

    @Autowired
    private LibroRepository libroRepository;

    @Override
    public PublicacionResponseDTO publicarLibro(PublicacionRequestDTO request, String email) {
        PublicacionId publicacionId = new PublicacionId(request.isbn(),email,LocalDateTime.now());
        Publicacion publicacion = new Publicacion();
        publicacion.setId(publicacionId);
        publicacion.setEstadoFisico(request.estadoFisico());
        publicacion.setValorPuntosSolicitado(request.valorPuntosSolicitado());
        publicacion.setComentario(request.comentario());
        Integer valorRef = calculadora.calcular(request.isbn(), request.estadoFisico());
        publicacion.setValorReferenciaCalculado(valorRef);
        publicacion.setColorSemaforo(calculadora.calculadoraColor(request.valorPuntosSolicitado(),valorRef));
        Publicacion retornar = publicacionRepository.save(publicacion);
        return publicacionMapper.toDTO(retornar);
    }

    @Override
    public PublicacionResponseDTO verDetallesPublicacion(PublicacionId id) {
        Publicacion publicacion = publicacionRepository.findById(id).orElseThrow(()-> new PublicacionNoExisteException());
        return publicacionMapper.toDTO(publicacion);
    }

    @Override
    public void editarPublicacion(PublicacionId id, PublicacionRequestDTO dto) {
        Publicacion publicacion = publicacionRepository.findById(id).orElseThrow(()-> new PublicacionNoExisteException());
        Libro libro = libroRepository.findByIsbn(dto.isbn()).orElseThrow(()-> new LibroNoExisteException());
        publicacion.setLibro(libro);
        publicacion.setEstadoFisico(dto.estadoFisico());
        publicacion.setComentario(dto.comentario());
        Integer valorRef = calculadora.calcular(dto.isbn(),dto.estadoFisico());
        publicacion.setValorReferenciaCalculado(valorRef);
        publicacion.setColorSemaforo(calculadora.calculadoraColor(dto.valorPuntosSolicitado(),valorRef));
    }




}
