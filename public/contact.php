<?php
/**
 * MacDaly.com Contact Form Handler (PHP Version)
 * Replaces the Node.js API route for lower maintenance on GoDaddy Shared Hosting.
 */

header('Content-Type: application/json');

// 1. Load Environment Variables from the GoDaddy Specific Path
$env_path = '/home/rsa1bm8j8le5/.env';
$env_vars = [];

if (file_exists($env_path)) {
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $env_vars[trim($name)] = trim($value);
        }
    }
}

// 2. Get Form Data
// Since Astro sends JSON, we read from php://input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(['message' => 'Invalid request data.']);
    http_response_code(400);
    exit;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$message = trim($data['message'] ?? '');
$honeypot = trim($data['honeypot'] ?? ''); // Honeypot field

// 3. Validation
if (empty($name) || empty($email) || empty($message)) {
    echo json_encode(['message' => 'Validation failed: Name, Email, and Message are required.']);
    http_response_code(400);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['message' => 'Invalid email address.']);
    http_response_code(400);
    exit;
}

// 4. Honeypot check
if (!empty($honeypot)) {
    // Silently succeed to fool bots
    echo json_encode(['message' => 'Success (Honeypot triggered)']);
    http_response_code(200);
    exit;
}

// 5. Send Email
// Note: On GoDaddy, sometimes standard mail() works, but authenticated SMTP is more reliable.
// We'll use the mail() function first as it's the "native" path.
// If delivery fails, we recommend using a library like PHPMailer.

$to = "keith@macdaly.com";
$subject = "New Contact Form Submission from $name";
$body = "Name: $name\nEmail: $email\n\nMessage:\n$message\n\n---";
$headers = "From: " . ($env_vars['SMTP_USER'] ?? "no-reply@macdaly.com") . "\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

if (mail($to, $subject, $body, $headers)) {
    echo json_encode(['message' => 'Thanks, your message has been sent.']);
    http_response_code(200);
} else {
    echo json_encode(['message' => 'There was an error sending your message. Please try again.']);
    http_response_code(500);
}
