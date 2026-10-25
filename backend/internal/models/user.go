package models

import "shared/pkg/types"

type CreateUserRequest struct {
	FirstName    string           `json:"first_name" binding:"required"`
	LastName     string           `json:"last_name" binding:"required"`
	EmailAddress string           `json:"email_address" binding:"required,email"`
	Password     string           `json:"password" binding:"required"`
	Thumbnail    types.NullString `json:"thumbnail"`
}

type PatchUserRequest struct {
	FirstName              string   `json:"first_name"`
	LastName               string   `json:"last_name"`
	EmailAddress           string   `json:"email_address"`
	Thumbnail              string   `json:"thumbnail"`
	CityID                 string   `json:"city_id"`
	CountryID              string   `json:"country_id"`
	StateID                string   `json:"state_id"`
	PostalCode             string   `json:"postal_code"`
	OtherPlatformsAccounts []string `json:"other_platforms_accounts"`
	DateOfBirth            *string  `json:"date_of_birth"`
	Gender                 *string  `json:"gender"`
}

type VerifyRequest struct {
	VerificationCode string `json:"verification_code" binding:"required"`
}

type LoginRequest struct {
	EmailAddress string `json:"email_address" binding:"required,email"`
	Password     string `json:"password" binding:"required"`
}
