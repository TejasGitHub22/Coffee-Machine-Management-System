package com.coffee.coffeeApp.dto;

import lombok.Data;

@Data
public class LoginResponseDto {
	String jwt;
	String userId;
	String role;
	Integer facilityId;
	String facilityName;
	
	public LoginResponseDto(String jwt, String userId, String role) {
		this.jwt = jwt;
		this.userId = userId;
		this.role = role;
	}
	
	public LoginResponseDto(String jwt, String userId, String role, Integer facilityId, String facilityName) {
		this.jwt = jwt;
		this.userId = userId;
		this.role = role;
		this.facilityId = facilityId;
		this.facilityName = facilityName;
	}
}
