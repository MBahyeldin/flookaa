package status

import (
	"net/http"
	"whatsapp/internal/whatsapp"

	"github.com/gin-gonic/gin"
)

// Handler reports the WhatsApp connection state.
//
// This exists because pairing happens through stdout: without it, the only way
// to discover that the account has been logged out is to tail journalctl.
type Handler struct {
	svc *whatsapp.Service
}

func NewHandler(svc *whatsapp.Service) *Handler {
	return &Handler{svc: svc}
}

// Status always returns 200 with the current state. It deliberately does not
// return a failure status when logged out: anything that gates restarts on a
// readiness check would otherwise crash-loop a service that only a human with
// a phone can fix.
func (h *Handler) Status(c *gin.Context) {
	c.JSON(http.StatusOK, h.svc.Status())
}
