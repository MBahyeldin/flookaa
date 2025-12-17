package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"time"
)

func SendEmail(reciever string, verificationLink string) error {
	from := os.Getenv("SMTP_EMAIL_ADDRESS")
	password := os.Getenv("SMTP_EMAIL_PASSWORD")

	to := []string{reciever}

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	body := getEmailBody(verificationLink)

	message := []byte(
		"From: no-reply <" + from + ">\r\n" +
			"To: " + reciever + "\r\n" +
			"Subject: Verify your email address\r\n" +
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
