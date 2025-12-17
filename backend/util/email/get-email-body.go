package email

func getEmailBody(verificationLink string) string {
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
		</style>
		</head>
		<body>
			<div class="container">
				<h1>Welcome to Flookaa 👋</h1>
				<p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
				<p>
					<a href="` + verificationLink + `" class="button">Verify Email</a>
				</p>
				<div class="footer">
				&copy; 2025 Flookaa. All rights reserved.
				</div>
			</div>
		</body>
		</html>
	`
}
