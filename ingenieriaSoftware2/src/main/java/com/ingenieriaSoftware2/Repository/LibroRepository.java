package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Libro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LibroRepository extends JpaRepository<Libro, String> {
    Optional<Libro> findByIsbn(String isbn);
}
