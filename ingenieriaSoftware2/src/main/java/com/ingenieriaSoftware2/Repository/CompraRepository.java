package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompraRepository extends JpaRepository<Compra, CompraId> {
    List<Compra> findById_CompradorEmail(String email);

    List<Compra> findById_PropietarioEmail(String email);
}
