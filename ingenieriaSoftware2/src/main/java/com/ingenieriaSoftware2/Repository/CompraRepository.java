package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompraRepository extends JpaRepository<Compra, CompraId> {

}
