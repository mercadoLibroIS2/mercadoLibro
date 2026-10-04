package com.ingenieriaSoftware2.Repository;

import com.ingenieriaSoftware2.Entity.Compra;
import com.ingenieriaSoftware2.Entity.Ids.CompraId;
import com.ingenieriaSoftware2.Entity.Usuario;
import com.ingenieriaSoftware2.Enums.EstadoCompra;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompraRepository extends JpaRepository<Compra, CompraId> {
	java.util.List<Compra> findByComprador(Usuario comprador);
	java.util.List<Compra> findByPropietario(Usuario propietario);
	java.util.List<Compra> findByEstado(EstadoCompra estado);
}
