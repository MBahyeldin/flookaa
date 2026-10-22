package users

import (
	"app/internal/auth"
	"app/internal/onboarding"
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

type onboardingRequest struct {
	Step   string            `json:"step" binding:"required"`
	Action onboarding.Action `json:"action" binding:"required"`
}

// MoveOnboarding advances, skips or goes back one onboarding step.
func (h *Handler) MoveOnboarding(c *gin.Context) {
	ctx := c.Request.Context()
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	var input onboardingRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_input"})
		return
	}

	user, err := h.q.GetUserBasicInfo(ctx, userId)
	if err != nil {
		auth.Unauthorized(c)
		return
	}
	state := h.state(ctx, userId, user.OnboardingStep, user.OnboardingCompleted)

	result, err := h.onboarding.Move(ctx, userId, user.OnboardingStep, user.OnboardingCompleted, input.Step, input.Action)
	switch {
	case errors.Is(err, onboarding.ErrCompleted), errors.Is(err, onboarding.ErrStepMismatch):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "onboarding": state})
		return
	case errors.Is(err, onboarding.ErrStepIncomplete), errors.Is(err, onboarding.ErrStepRequired),
		errors.Is(err, onboarding.ErrNoPreviousStep), errors.Is(err, onboarding.ErrInvalidAction):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "onboarding": state})
		return
	case err != nil:
		log.Printf("onboarding: move for user %d: %v", userId, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "onboarding_failed"})
		return
	}

	if !result.Write {
		c.JSON(http.StatusOK, gin.H{"onboarding": h.state(ctx, userId, user.OnboardingStep, user.OnboardingCompleted)})
		return
	}

	row, err := h.q.AdvanceOnboarding(ctx, db.AdvanceOnboardingParams{
		UserID:    userId,
		FromStep:  user.OnboardingStep,
		ToStep:    result.Step,
		Completed: result.Completed,
	})
	if errors.Is(err, sql.ErrNoRows) {
		// Another request moved it first.
		if fresh, err := h.q.GetUserBasicInfo(ctx, userId); err == nil {
			state = h.state(ctx, userId, fresh.OnboardingStep, fresh.OnboardingCompleted)
		}
		c.JSON(http.StatusConflict, gin.H{"error": onboarding.ErrStepMismatch.Error(), "onboarding": state})
		return
	}
	if err != nil {
		log.Printf("onboarding: advance for user %d: %v", userId, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "onboarding_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"onboarding": h.state(ctx, userId, row.OnboardingStep, row.OnboardingCompleted)})
}

func (h *Handler) state(ctx context.Context, userID int64, lastStep int32, completed bool) onboarding.State {
	st, err := h.onboarding.State(ctx, userID, lastStep, completed)
	if err != nil {
		log.Printf("onboarding: state for user %d: %v", userID, err)
	}
	return st
}
