package com.ingenieriaSoftware2.Service.Implementations;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ingenieriaSoftware2.DTO.Request.CompraRequestDTO;
import com.ingenieriaSoftware2.DTO.Response.CompraResponseDTO;
import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import com.ingenieriaSoftware2.Exception.Compra.CompraOperacionException;
import com.ingenieriaSoftware2.Exception.Usuario.UsuarioNoEncontrado;
import com.ingenieriaSoftware2.Repository.CompraRepository;
import com.ingenieriaSoftware2.Repository.LibroRepository;
import com.ingenieriaSoftware2.Repository.UsuarioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CompraService;

import jakarta.transaction.Transactional;

@Service
public class CompraServiceImpl implements CompraService {
    @Autowired
    private CompraRepository compraRepository;
    @Autowired
    private LibroRepository libroRepository;
    @Autowired
    private UsuarioRepository usuarioRepository;

    @Transactional
    @Override
    public CompraResponseDTO pedirCompra(UUID compradorId, CompraRequestDTO request) {
        Usuario comprador = usuario(compradorId);
        Libro libro = libroRepository.findByIsbnAndDisponibleTrue(request.isbn())
                .orElseThrow(() -> new CompraOperacionException("El libro no existe o no está disponible."));
        Usuario propietario = libro.getPropietario();
        if (propietario.getId().equals(comprador.getId())) {
            throw new CompraOperacionException("No puedes comprar tu propio libro.");
        }

        int puntos = Objects.requireNonNullElse(libro.getValorReferencia(), 0);
        if (puntos <= 0 || saldo(comprador) < puntos) {
            throw new CompraOperacionException("No tienes puntos suficientes para solicitar la compra.");
        }

        CompraId id = new CompraId(comprador.getEmail(), libro.getIsbn(), propietario.getEmail(), LocalDateTime.now());
        if (compraRepository.existsById(id)) {
            throw new CompraOperacionException("Ya existe una compra con este libro y comprador.");
        }

        Compra compra = new Compra();
        compra.setId(id);
        compra.setComprador(comprador);
        compra.setLibro(libro);
        compra.setPropietario(propietario);
        compra.setPuntos(puntos);
        compra.setTimestamp(Instant.now());
        compra.setEstado(EstadoCompra.PENDIENTE);

        reservar(comprador, puntos);
        libro.setDisponible(false);
        usuarioRepository.save(comprador);
        libroRepository.save(libro);
        return toResponse(compraRepository.save(compra));
    }

    @Transactional
    @Override
    public CompraResponseDTO aceptar(UUID propietarioId, CompraId compraId) {
        Compra compra = obtener(compraId);
        validarPropietario(compra, propietarioId);
        validarEstado(compra, EstadoCompra.PENDIENTE);
        compra.setEstado(EstadoCompra.ACEPTADA);
        return toResponse(compraRepository.save(compra));
    }

    @Transactional
    @Override
    public CompraResponseDTO rechazar(UUID propietarioId, CompraId compraId) {
        Compra compra = obtener(compraId);
        validarPropietario(compra, propietarioId);
        validarEstado(compra, EstadoCompra.PENDIENTE);
        devolverReserva(compra.getComprador(), compra.getPuntos());
        compra.getLibro().setDisponible(true);
        usuarioRepository.save(compra.getComprador());
        libroRepository.save(compra.getLibro());
        compra.setEstado(EstadoCompra.RECHAZADA);
        return toResponse(compraRepository.save(compra));
    }

    @Transactional
    @Override
    public CompraResponseDTO confirmar(UUID compradorId, CompraId compraId) {
        Compra compra = obtener(compraId);
        if (!compra.getComprador().getId().equals(compradorId)) {
            throw new CompraOperacionException("Solo el comprador puede confirmar la recepción.");
        }
        validarEstado(compra, EstadoCompra.ACEPTADA);
        int puntos = Objects.requireNonNullElse(compra.getPuntos(), 0);
        devolverReserva(compra.getComprador(), puntos);
        usuarioRepository.save(compra.getComprador());
        Usuario propietario = compra.getPropietario();
        propietario.setSaldoTotal(saldo(propietario) + puntos);
        usuarioRepository.save(propietario);
        compra.setEstado(EstadoCompra.CONFIRMADA);
        return toResponse(compraRepository.save(compra));
    }

    @Override
    public List<CompraResponseDTO> enviadas(UUID compradorId) {
        return compraRepository.findByCompradorOrderByTimestampDesc(usuario(compradorId))
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<CompraResponseDTO> recibidas(UUID propietarioId) {
        return compraRepository.findByPropietarioOrderByTimestampDesc(usuario(propietarioId))
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<CompraResponseDTO> confirmadas(UUID usuarioId) {
        Usuario usuario = usuario(usuarioId);
        return compraRepository.findByEstadoOrderByTimestampDesc(EstadoCompra.CONFIRMADA).stream()
                .filter(compra -> compra.getComprador().getId().equals(usuario.getId())
                        || compra.getPropietario().getId().equals(usuario.getId()))
                .map(this::toResponse).toList();
    }

    private Compra obtener(CompraId id) {
        return compraRepository.findById(id)
                .orElseThrow(() -> new CompraOperacionException("La compra no existe."));
    }

    private Usuario usuario(UUID id) {
        return usuarioRepository.findById(id).orElseThrow(UsuarioNoEncontrado::new);
    }

    private void validarPropietario(Compra compra, UUID propietarioId) {
        if (!compra.getPropietario().getId().equals(propietarioId)) {
            throw new CompraOperacionException("Solo el propietario puede aceptar o rechazar la compra.");
        }
    }

    private void validarEstado(Compra compra, EstadoCompra esperado) {
        if (compra.getEstado() != esperado) {
            throw new CompraOperacionException("La compra no está en estado " + esperado + ".");
        }
    }

    private int saldo(Usuario usuario) {
        return Objects.requireNonNullElse(usuario.getSaldoTotal(), 0);
    }

    private void reservar(Usuario usuario, int puntos) {
        usuario.setSaldoTotal(saldo(usuario) - puntos);
        usuario.setSaldoReservado(Objects.requireNonNullElse(usuario.getSaldoReservado(), 0) + puntos);
    }

    private void devolverReserva(Usuario usuario, Integer puntos) {
        int cantidad = Objects.requireNonNullElse(puntos, 0);
        usuario.setSaldoTotal(saldo(usuario) + cantidad);
        usuario.setSaldoReservado(Math.max(0, Objects.requireNonNullElse(usuario.getSaldoReservado(), 0) - cantidad));
    }

    private CompraResponseDTO toResponse(Compra compra) {
        return new CompraResponseDTO(compra.getId(), compra.getComprador().getId(),
                compra.getPropietario().getId(), compra.getLibro().getId(), compra.getLibro().getIsbn(),
                compra.getPuntos(), compra.getTimestamp(), compra.getEstado());
    }
}