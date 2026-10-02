package com.ingenieriaSoftware2.Service.Implementations;

import com.ingenieriaSoftware2.Repository.NotificacionRepository;
import com.ingenieriaSoftware2.Service.Interfaces.NotificacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NotificacionServiceImpl implements NotificacionService {
    @Autowired
    private NotificacionRepository notificacionRepository;
}
