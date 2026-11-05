package email

import (
	"html"
	"strconv"
	"time"
)

func page(content string) string {
	return `
	<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="UTF-8">
		<title>Welcome to Flookaa</title>
		<style>
			/* Inline CSS is safer for emails */
			body {
				font-family: Arial, sans-serif;
				background-color: #f5f5f5;
				margin: 0;
				padding: 0;
			}
			.container {
				max-width: 600px;
				margin: 40px auto;
				background-color: #ffffff;
				padding: 30px;
				border-radius: 10px;
				box-shadow: 0 0 10px rgba(0,0,0,0.05);
			}
			h1 {
				color: #1a73e8;
				font-size: 24px;
				margin-bottom: 20px;
			}
			p {
				font-size: 16px;
				color: #333333;
				line-height: 1.5;
			}
			.button {
				display: inline-block;
				padding: 12px 25px;
				margin-top: 20px;
				font-size: 16px;
				color: #ffffff !important;
				background-color: #1a73e8;
				text-decoration: none;
				border-radius: 5px;
			}
			.footer {
				margin-top: 30px;
				font-size: 12px;
				color: #999999;
				text-align: center;
			}
			.verification-code {
				display: inline-block;
				margin-top: 15px;
				padding: 10px 20px;
				font-size: 20px;
				color: #1a73e8;
				background-color: #f0f0f0;
				border-radius: 5px;
				letter-spacing: 4px;
			}
		</style>
		</head>
		<body>
			<div class="container">
				` + content + `
				<div class="footer">
				&copy; ` + strconv.Itoa(time.Now().Year()) + ` Flookaa. All rights reserved.
				</div>
			</div>
		</body>
		</html>
	`
}

func verificationBody(code string) string {
	return page(`<h1>Welcome to Flookaa 👋</h1>
				<p>Thank you for signing up! Your verification code is:</p>
				<span class="verification-code">` + html.EscapeString(code) + `</span>`)
}

func emailChangeBody(code string) string {
	return page(`<h1>Confirm your new email</h1>
				<p>Enter this code in Flookaa to use this address for your account. It works for 1 hour.</p>
				<span class="verification-code">` + html.EscapeString(code) + `</span>
				<p>If you didn't ask for this, ignore this email.</p>`)
}

func emailChangedBody(newEmail string) string {
	return page(`<h1>Your email was changed</h1>
				<p>Your Flookaa account now uses <strong>` + html.EscapeString(newEmail) + `</strong>.</p>
				<p>If this wasn't you, reset your password and contact us.</p>`)
}

func passwordResetBody(link string) string {
	l := html.EscapeString(link)
	return page(`<h1>Reset your Flookaa password</h1>
				<p>Someone asked to reset the password of your Flookaa account. The link works for 1 hour, once.</p>
				<a class="button" href="` + l + `">Choose a new password</a>
				<p>If you didn't ask for this, ignore this email; your password stays the same.</p>`)
}
