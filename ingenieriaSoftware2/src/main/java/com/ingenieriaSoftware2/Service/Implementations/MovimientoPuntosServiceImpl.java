package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Repository.MovimientoPuntosRepository;
import com.ingenieriaSoftware2.Service.Interfaces.MovimientoPuntosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MovimientoPuntosServiceImpl implements MovimientoPuntosService {
    @Autowired
    private MovimientoPuntosRepository movimientoPuntosRepository;

}
