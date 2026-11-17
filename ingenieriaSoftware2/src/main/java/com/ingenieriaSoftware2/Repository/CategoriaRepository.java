package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaRepository extends JpaRepository<Categoria, String> {
}
