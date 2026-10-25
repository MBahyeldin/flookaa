package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"time"
)

type Config struct {
	Host     string
	Port     string
	Address  string
	Password string
}

type Sender struct {
	cfg Config
}

func NewSender(cfg Config) *Sender {
	return &Sender{cfg: cfg}
}

func (s *Sender) SendVerification(to, code string) error {
	return s.send(to, "Verify your email address", verificationBody(code))
}

func (s *Sender) SendEmailChangeCode(to, code string) error {
	return s.send(to, "Confirm your new email address", emailChangeBody(code))
}

func (s *Sender) SendEmailChanged(to, newEmail string) error {
	return s.send(to, "Your Flookaa email was changed", emailChangedBody(newEmail))
}

func (s *Sender) SendPasswordReset(to, link string) error {
	return s.send(to, "Reset your Flookaa password", passwordResetBody(link))
}

func (s *Sender) send(reciever, subject, body string) error {
	from := s.cfg.Address
	password := s.cfg.Password

	to := []string{reciever}

	smtpHost := s.cfg.Host
	smtpPort := s.cfg.Port

	message := []byte(
		"From: no-reply <" + from + ">\r\n" +
			"To: " + reciever + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"Date: " + time.Now().Format(time.RFC1123Z) + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n" +
			body,
	)

	auth := smtp.PlainAuth("", from, password, smtpHost)

	// Connect to SMTP server
	conn, err := smtp.Dial(smtpHost + ":" + smtpPort)
	if err != nil {
		return err
	}
	defer conn.Close()

	// Start TLS
	tlsConfig := &tls.Config{
		ServerName: smtpHost,
	}
	if err = conn.StartTLS(tlsConfig); err != nil {
		return err
	}

	if err = conn.Auth(auth); err != nil {
		return err
	}

	if err = conn.Mail(from); err != nil {
		return err
	}

	for _, addr := range to {
		if err = conn.Rcpt(addr); err != nil {
			return err
		}
	}

	w, err := conn.Data()
	if err != nil {
		return err
	}

	_, err = w.Write(message)
	if err != nil {
		return err
	}

	w.Close()
	conn.Quit()

	fmt.Println("Email sent successfully 🚀")
	return nil
}
