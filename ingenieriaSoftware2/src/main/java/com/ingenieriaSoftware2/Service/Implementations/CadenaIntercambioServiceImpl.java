package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Repository.CadenaIntercambioRepository;
import com.ingenieriaSoftware2.Service.Interfaces.CadenaIntercambioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CadenaIntercambioServiceImpl implements CadenaIntercambioService {
    @Autowired
    private CadenaIntercambioRepository cadenaIntercambioRepository;


}
