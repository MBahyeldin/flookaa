package models

import "shared/pkg/types"

type CreateUserRequest struct {
	FirstName    string           `json:"first_name" binding:"required"`
	LastName     string           `json:"last_name" binding:"required"`
	EmailAddress string           `json:"email_address" binding:"required,email"`
	Phone        string           `json:"phone" binding:"required"`
	Password     string           `json:"password" binding:"required,min=6"`
	Thumbnail    types.NullString `json:"thumbnail"`
}

type PatchUserRequest struct {
	FirstName              string   `json:"first_name"`
	LastName               string   `json:"last_name"`
	Phone                  string   `json:"phone"`
	EmailAddress           string   `json:"email_address"`
	HashedPassword         string   `json:"hashed_password" binding:"omitempty,min=6"`
	Thumbnail              string   `json:"thumbnail"`
	Bio                    string   `json:"bio"`
	CityID                 string   `json:"city_id"`
	CountryID              string   `json:"country_id"`
	StateID                string   `json:"state_id"`
	PostalCode             string   `json:"postal_code"`
	OtherPlatformsAccounts []string `json:"other_platforms_accounts" gorm:"type:text"`
}

type VerifyRequest struct {
	VerificationCode string `json:"verification_code" binding:"required"`
}

type LoginRequest struct {
	EmailAddress string `json:"email_address" binding:"required,email"`
	Password     string `json:"password" binding:"required"`
}
