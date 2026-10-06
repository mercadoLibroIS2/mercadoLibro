package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Entity.Ids.PublicacionId;
import com.ingenieriaSoftware2.Entity.Publicacion;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import com.ingenieriaSoftware2.Enums.EstadoPublicacion;
import com.ingenieriaSoftware2.Exception.Compra.CompraNoEncontradaException;
import com.ingenieriaSoftware2.Exception.Compra.EstadoCompraInvalidoException;
import com.ingenieriaSoftware2.Exception.Intercambio.AccionNoPermitidaException;
import com.ingenieriaSoftware2.Exception.Publicacion.PublicacionNoExisteException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Mapper.CompraMapper;
import com.ingenieriaSoftware2.Repository.CompraRepository;
import com.ingenieriaSoftware2.Repository.PublicacionRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CompraService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class CompraServiceImpl implements CompraService {

    @Autowired
    private CompraRepository compraRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private CompraMapper compraMapper;

    @Override
    @Transactional
    public CompraResponseDTO realizarCompra(CompraRequestDTO request, UUID compradorId) {
        String emailComprador = obtenerEmail(compradorId);

        if (emailComprador.equals(request.emailPropietario())) {
            throw new AccionNoPermitidaException("No podés comprar tu propia publicación");
        }

        PublicacionId publicacionId = new PublicacionId(request.isbn(), request.emailPropietario(), request.horaPublicacion());
        Publicacion publicacion = publicacionRepository.findById(publicacionId).orElseThrow(()-> new PublicacionNoExisteException());

        if (publicacion.getEstadoPublicacion() != EstadoPublicacion.DISPONIBLE) {
            throw new EstadoCompraInvalidoException("La publicación no está disponible");
        }

        CompraId id = new CompraId(emailComprador,request.isbn(), request.emailPropietario(), request.horaPublicacion());

        if (compraRepository.existsById(id)) {
            throw new EstadoCompraInvalidoException("Ya tenés una compra registrada para esta publicación");
        }

        Compra compra = new Compra();
        compra.setId(id);
        compra.setLibro(publicacion.getLibro());
        compra.setPuntos(publicacion.getValorPuntosSolicitado());
        compra.setEstado(EstadoCompra.PENDIENTE_PAGO);

        return compraMapper.toDTO(compraRepository.save(compra));
    }

    @Override
    @Transactional
    public CompraResponseDTO obtenerPorId(CompraId compraId) {
        return compraMapper.toDTO(buscarCompra(compraId));
    }

    @Override
    @Transactional
    public List<CompraResponseDTO> listarPorComprador(UUID compradorId) {
        return compraRepository.findById_CompradorEmail(obtenerEmail(compradorId)).stream()
                .map(compraMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public List<CompraResponseDTO> listarPorVendedor(UUID vendedorId) {
        return compraRepository.findById_PropietarioEmail(obtenerEmail(vendedorId)).stream()
                .map(compraMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public CompraResponseDTO confirmarPago(CompraId compraId) {
        Compra compra = buscarCompra(compraId);
        validarEstado(compra, EstadoCompra.PENDIENTE_PAGO);

        compra.setEstado(EstadoCompra.PAGADA);
        // Acá iría el descuento de puntos al comprador (MovimientoPuntosCompra)
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO marcarComoEnviada(CompraId compraId, String infoEnvio) {
        Compra compra = buscarCompra(compraId);
        validarEstado(compra, EstadoCompra.PAGADA);

        compra.setEstado(EstadoCompra.ENVIADA);
        compra.setInfoEnvio(infoEnvio);
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO marcarComoEntregada(CompraId compraId) {
        Compra compra = buscarCompra(compraId);
        validarEstado(compra, EstadoCompra.ENVIADA);

        compra.setEstado(EstadoCompra.ENTREGADA);
        // Acá iría la acreditación de puntos al vendedor
        return compraMapper.toDTO(compra);
    }

    @Override
    @Transactional
    public CompraResponseDTO cancelarCompra(CompraId compraId, String motivo) {
        Compra compra = buscarCompra(compraId);
        validarEstado(compra, EstadoCompra.PENDIENTE_PAGO, EstadoCompra.PAGADA);

        compra.setEstado(EstadoCompra.CANCELADA);
        compra.setMotivoCancelacion(motivo);
        // Si ya estaba PAGADA, acá habría que devolverle los puntos al comprador
        return compraMapper.toDTO(compra);
    }

    // ---------- Métodos auxiliares ----------

    private Compra buscarCompra(CompraId id) {
        return compraRepository.findById(id).orElseThrow(()-> new CompraNoEncontradaException());
    }

    private String obtenerEmail(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .map(Usuario::getEmail)
                .orElseThrow(()-> new UsuarioNoEncontrado());
    }

    private void validarEstado(Compra compra, EstadoCompra... estadosPermitidos) {
        if (!Arrays.asList(estadosPermitidos).contains(compra.getEstado())) {
            throw new EstadoCompraInvalidoException(
                    "No se puede realizar esta acción con la compra en estado " + compra.getEstado());
        }
    }
}