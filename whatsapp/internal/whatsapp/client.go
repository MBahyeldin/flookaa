package whatsapp

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/mdp/qrterminal/v3"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"

	// modernc.org/sqlite is a pure-Go driver. The usual mattn/go-sqlite3 is
	// CGO-only, which would break the CGO_ENABLED=0 linux/amd64 cross-build in
	// deploy.bash. It registers itself under the driver name "sqlite".
	_ "modernc.org/sqlite"
)

// ErrNotConnected is returned by send paths while the service is running but
// has no usable WhatsApp connection (unpaired, logged out, or reconnecting).
var ErrNotConnected = errors.New("whatsapp client is not connected")

// Service owns the single whatsmeow client and its connection lifecycle.
type Service struct {
	client *whatsmeow.Client
	device *store.Device
	log    waLog.Logger

	mu             sync.RWMutex
	connectedSince time.Time
	lastEvent      string

	// pairing guards against two pair loops running at once, which would race
	// on GetQRChannel.
	pairing sync.Mutex
}

// Status is the snapshot returned by GET /api/v1/status.
type Status struct {
	Connected      bool       `json:"connected"`
	LoggedIn       bool       `json:"logged_in"`
	JID            string     `json:"jid,omitempty"`
	ConnectedSince *time.Time `json:"connected_since,omitempty"`
	LastEvent      string     `json:"last_event,omitempty"`
}

// New opens the session store and builds the client, but does not connect.
func New(ctx context.Context, sessionDBPath string) (*Service, error) {
	if err := os.MkdirAll(filepath.Dir(sessionDBPath), 0o755); err != nil {
		return nil, fmt.Errorf("failed to create session directory: %w", err)
	}

	// foreign_keys is required by sqlstore.Upgrade; busy_timeout keeps
	// concurrent sends from failing outright on a locked database.
	dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)", sessionDBPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open session database: %w", err)
	}
	// SQLite tolerates exactly one writer; whatsmeow writes on nearly every
	// event, so serialise rather than fight for the lock.
	db.SetMaxOpenConns(1)

	logger := waLog.Stdout("whatsmeow", "INFO", true)

	container := sqlstore.NewWithDB(db, "sqlite3", logger)
	if err := container.Upgrade(ctx); err != nil {
		return nil, fmt.Errorf("failed to upgrade session database: %w", err)
	}

	device, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load device from session database: %w", err)
	}

	// This service only sends. Asking for no history keeps session.db small and
	// keeps other people's old conversations off this box entirely.
	store.DeviceProps.RequireFullSync = ptr(false)
	store.DeviceProps.HistorySyncConfig = nil

	s := &Service{
		client: whatsmeow.NewClient(device, logger),
		device: device,
		log:    logger,
	}
	s.client.EnableAutoReconnect = true
	s.client.AddEventHandler(s.handleEvent)

	return s, nil
}

// Start connects to WhatsApp, running the QR pairing flow first if the session
// store has no linked device yet. It returns once the connection attempt has
// been kicked off; pairing continues in the background.
func (s *Service) Start(ctx context.Context) error {
	if s.client.Store.ID == nil {
		go s.pairLoop(ctx)
		return nil
	}

	if err := s.client.Connect(); err != nil {
		return fmt.Errorf("failed to connect to whatsapp: %w", err)
	}
	return nil
}

// Stop closes the WhatsApp connection cleanly. Every deploy restarts this
// service, and a clean disconnect looks less like a crash to WhatsApp than a
// dropped socket does.
func (s *Service) Stop() {
	s.client.Disconnect()
}

// Client exposes the underlying client to the send path.
func (s *Service) Client() *whatsmeow.Client { return s.client }

// Ready reports whether a send can be attempted right now.
func (s *Service) Ready() bool {
	return s.client.IsConnected() && s.client.IsLoggedIn()
}

func (s *Service) Status() Status {
	s.mu.RLock()
	since := s.connectedSince
	lastEvent := s.lastEvent
	s.mu.RUnlock()

	st := Status{
		Connected: s.client.IsConnected(),
		LoggedIn:  s.client.IsLoggedIn(),
		LastEvent: lastEvent,
	}
	if id := s.client.Store.ID; id != nil {
		st.JID = id.String()
	}
	if !since.IsZero() && st.Connected {
		st.ConnectedSince = &since
	}
	return st
}

// pairLoop prints a QR code to stdout until the device is linked. Because the
// service is headless, this log is the only pairing channel: watch it with
// `journalctl -u whatsapp -f` and scan from WhatsApp > Linked devices.
func (s *Service) pairLoop(ctx context.Context) {
	s.pairing.Lock()
	defer s.pairing.Unlock()

	for {
		if ctx.Err() != nil {
			return
		}
		if s.client.Store.ID != nil {
			return // linked by another path already
		}

		qrChan, err := s.client.GetQRChannel(ctx)
		if err != nil {
			s.log.Errorf("Failed to get QR channel: %v", err)
			if !sleepCtx(ctx, 10*time.Second) {
				return
			}
			continue
		}

		if err := s.client.Connect(); err != nil {
			s.log.Errorf("Failed to connect for pairing: %v", err)
			if !sleepCtx(ctx, 10*time.Second) {
				return
			}
			continue
		}

		paired := false
		for item := range qrChan {
			switch item.Event {
			case "code":
				fmt.Println("\n=== WhatsApp is NOT linked. Scan this QR from WhatsApp > Linked devices ===")
				qrterminal.GenerateHalfBlock(item.Code, qrterminal.L, os.Stdout)
				fmt.Printf("=== This code expires in %s ===\n\n", item.Timeout)
			case "success":
				s.log.Infof("Pairing succeeded")
				paired = true
			default:
				s.log.Warnf("Pairing event: %s (%v)", item.Event, item.Error)
			}
		}

		if paired {
			return
		}

		// The channel closed without success (timeout, or an unexpected
		// event). Drop the half-open socket and offer a fresh code.
		s.log.Warnf("Pairing did not complete, retrying")
		s.client.Disconnect()
		if !sleepCtx(ctx, 5*time.Second) {
			return
		}
	}
}

// handleEvent tracks connection state only. Inbound messages and receipts are
// intentionally ignored: this is a send-only service.
func (s *Service) handleEvent(evt any) {
	switch v := evt.(type) {
	case *events.Connected:
		s.mu.Lock()
		s.connectedSince = time.Now().UTC()
		s.lastEvent = "connected"
		s.mu.Unlock()
		s.log.Infof("Connected to WhatsApp")

	case *events.Disconnected:
		s.mu.Lock()
		s.connectedSince = time.Time{}
		s.lastEvent = "disconnected"
		s.mu.Unlock()
		s.log.Warnf("Disconnected from WhatsApp, auto-reconnect will retry")

	case *events.StreamReplaced:
		s.mu.Lock()
		s.lastEvent = "stream_replaced"
		s.mu.Unlock()
		s.log.Errorf("Stream replaced: another client logged in with this session")

	case *events.PairSuccess:
		s.mu.Lock()
		s.lastEvent = "pair_success"
		s.mu.Unlock()
		s.log.Infof("Device paired as %s", v.ID)

	case *events.LoggedOut:
		s.mu.Lock()
		s.connectedSince = time.Time{}
		s.lastEvent = "logged_out"
		s.mu.Unlock()
		s.log.Errorf("Logged out of WhatsApp (on_connect=%t reason=%s), re-pairing required", v.OnConnect, v.Reason)
		go s.rePair()
	}
}

// rePair clears the dead session and restarts the QR flow, so a logout recovers
// by scanning a code rather than by someone noticing and redeploying.
func (s *Service) rePair() {
	ctx := context.Background()

	s.client.Disconnect()
	if err := s.device.Delete(ctx); err != nil {
		s.log.Errorf("Failed to clear the logged-out session: %v", err)
		return
	}

	s.pairLoop(ctx)
}

// sleepCtx waits for d, returning false if ctx was cancelled first.
func sleepCtx(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}

func ptr[T any](v T) *T { return &v }
