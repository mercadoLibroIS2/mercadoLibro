package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Repository.IntercambioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.IntercambioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class IntercambioServiceImpl implements IntercambioService {
    @Autowired
    private IntercambioRepository intercambioRepository;
}
