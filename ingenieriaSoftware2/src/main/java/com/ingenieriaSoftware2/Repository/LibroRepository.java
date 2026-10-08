package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Libro;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.CategoriaLibro;
import com.ingenieriaSoftware2.Enums.EstadoFisico;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LibroRepository extends JpaRepository<Libro, UUID> {
    Page<Libro> findByDisponibleTrue(Pageable pageable);

    List<Libro> findByPropietario(Usuario propietario);

    List<Libro> findByPropietarioId(UUID propietarioId);

    Optional<Libro> findByIsbnAndDisponibleTrue(String isbn);

    @Query("SELECT l FROM Libro l WHERE " +
            "(:query IS NULL OR LOWER(l.titulo) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(l.autor) LIKE LOWER(CONCAT('%', :query, '%')) OR l.isbn LIKE CONCAT('%', :query, '%')) AND " +
            "(:categoria IS NULL OR :categoria MEMBER OF l.categoria) AND " +
            "(:estado IS NULL OR l.estadoFisico = :estado) AND " +
            "(:precioMin IS NULL OR l.valorReferencia >= :precioMin) AND " +
            "(:precioMax IS NULL OR l.valorReferencia <= :precioMax) AND " +
            "l.disponible = true")
    Page<Libro> buscarConFiltros(@Param("query") String query,
                                 @Param("categoria") CategoriaLibro categoria,
                                 @Param("estado") EstadoFisico estado,
                                 @Param("precioMin") Integer precioMin,
                                 @Param("precioMax") Integer precioMax,
                                 Pageable pageable);

    @Query("SELECT DISTINCT l.titulo FROM Libro l WHERE LOWER(l.titulo) LIKE LOWER(CONCAT(:query, '%')) AND l.disponible = true")
    List<String> findSuggestionsByTitulo(@Param("query") String query, Pageable pageable);
}
