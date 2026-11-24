package com.farmtracker.service;

import com.farmtracker.dto.AuthDtos.AuthResponse;
import com.farmtracker.dto.AuthDtos.LoginRequest;
import com.farmtracker.dto.AuthDtos.RegisterRequest;
import com.farmtracker.model.User;
import com.farmtracker.repository.UserRepository;
import com.farmtracker.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();
        if (users.existsByUsername(username) || users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "That username or email is already registered");
        }
        var user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        users.save(user);
        return new AuthResponse(jwtService.createToken(username), username, email);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication result = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.identifier(), request.password()));
        String username = ((UserDetails) result.getPrincipal()).getUsername();
        User user = users.findByUsername(username).orElseThrow();
        return new AuthResponse(jwtService.createToken(username), user.getUsername(), user.getEmail());
    }
}