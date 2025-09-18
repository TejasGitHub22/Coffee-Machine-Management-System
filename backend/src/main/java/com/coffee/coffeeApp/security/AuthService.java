package com.coffee.coffeeApp.security;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.coffee.coffeeApp.dto.LoginRequestDto;
import com.coffee.coffeeApp.dto.LoginResponseDto;
import com.coffee.coffeeApp.dto.SignupRequestDto;
import com.coffee.coffeeApp.dto.SignupResponseDto;
import com.coffee.coffeeApp.entity.User;
import com.coffee.coffeeApp.entity.Facility;
import com.coffee.coffeeApp.repository.UserRepository;
import com.coffee.coffeeApp.repository.FacilityRepository;


import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

@Service
public class AuthService {

	private final AuthenticationManager authenticationManager;
	private final AuthUtil authUtil;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final FacilityRepository facilityRepository;
	
	public AuthService(AuthenticationManager authenticationManager, AuthUtil authUtil, UserRepository userRepository, PasswordEncoder passwordEncoder, FacilityRepository facilityRepository) {
		this.authenticationManager = authenticationManager;
		this.authUtil = authUtil;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.facilityRepository = facilityRepository;
	}
	
	public LoginResponseDto login(LoginRequestDto loginRequestDto) {
		//authenticating the user...
		Authentication authentication = authenticationManager.authenticate(
			new UsernamePasswordAuthenticationToken(loginRequestDto.getUsername(), loginRequestDto.getPassword())
		);
		
		//getting the object of authenticated user...
		User user = (User) authentication.getPrincipal();
			
		//getting the JWT token...
		String token = authUtil.generateAccessToken(user);
		
		// Convert backend role to frontend role format
		String frontendRole = user.getRole().equals("ROLE_ADMIN") ? "ADMIN" : "FACILITY";
		
		// Include facility information for technicians
		if (user.getFacility() != null) {
			return new LoginResponseDto(token, user.getId().toString(), frontendRole, 
					user.getFacility().getId(), user.getFacility().getName());
		}
		
		return new LoginResponseDto(token, user.getId().toString(), frontendRole);
	}
	
	public SignupResponseDto signup(SignupRequestDto signupRequestDto) {
		User isUserExisting = userRepository.findByUsername(signupRequestDto.getUsername()).orElse(null);
		
		if(isUserExisting != null) throw new IllegalArgumentException("User already exists");
		
		// Check if email already exists
		User isEmailExisting = userRepository.findByEmail(signupRequestDto.getEmail()).orElse(null);
		
		if(isEmailExisting != null) throw new IllegalArgumentException("Email already exists");
		
		String encodedPassword = passwordEncoder.encode(signupRequestDto.getPassword());
		
		// Handle facility assignment for TECHNICIAN users
		Facility facility = null;
		if ("ROLE_TECHNICIAN".equals(signupRequestDto.getRole()) && signupRequestDto.getFacilityId() != null) {
			facility = facilityRepository.findById(signupRequestDto.getFacilityId())
					.orElseThrow(() -> new IllegalArgumentException("Facility not found"));
		}
		
		User newUser = new User(
				signupRequestDto.getUsername(),
				signupRequestDto.getEmail(),
				encodedPassword,
				signupRequestDto.getRole(),
				true,
				facility
		);
		
		userRepository.save(newUser);
		
		return new SignupResponseDto(newUser.getId().toString(), newUser.getUsername());
	}
}
