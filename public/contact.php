<?php
/**
 * MacDaly.com Contact Form Handler (Universal GoDaddy Relay Version)
 * Uses Port 25 internal relay and BCC for lead tracking.
 */

header('Content-Type: application/json');

// --- 1. SETTINGS & LOGGING ---
$log_path = __DIR__ . '/contact_debug.log';
function debug_log($message) {
    global $log_path;
    $timestamp = date('H:i:s');
    @file_put_contents($log_path, "[$timestamp] $message\n", FILE_APPEND);
}

debug_log(">>> New submission request received.");

// --- 2. LOAD ENVIRONMENT VARIABLES ---
$doc_root = $_SERVER['DOCUMENT_ROOT'] ?? getcwd();
$path = dirname($doc_root) . '/macdaly.env';
$env_vars = [];

if (file_exists($path) && is_readable($path)) {
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $env_vars[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
}

// --- 3. GET FORM DATA ---
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(['message' => 'Invalid request data.']);
    http_response_code(400); exit;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$message = trim($data['message'] ?? '');
$honeypot = trim($data['honeypot'] ?? '');

if (empty($name) || empty($email) || empty($message)) {
    echo json_encode(['message' => 'Validation failed: All fields are required.']);
    http_response_code(400); exit;
}

if (!empty($honeypot)) {
    echo json_encode(['message' => 'Success']);
    http_response_code(200); exit;
}

// --- 4. RELAY SMTP CLIENT (GoDaddy Internal) ---
class RelaySMTP {
    private $socket;

    public function send($to, $fromName, $fromEmail, $subject, $body) {
        // GoDaddy relay settings (localhost:25, no auth)
        $this->socket = fsockopen('localhost', 25, $errno, $errstr, 10);
        if (!$this->socket) throw new Exception("Relay failed: $errstr ($errno)");

        $this->getResponse();
        fputs($this->socket, "HELO " . $_SERVER['SERVER_NAME'] . "\r\n");
        $this->getResponse();

        fputs($this->socket, "MAIL FROM:<$fromEmail>\r\n");
        $this->getResponse();

        fputs($this->socket, "RCPT TO:<$to>\r\n");
        $this->getResponse();

        fputs($this->socket, "DATA\r\n");
        $this->getResponse();

        $header = "To: $to\r\n";
        $header .= "From: $fromName <$fromEmail>\r\n";
        $header .= "Bcc: keith@macdaly.com\r\n"; // Added BCC for tracking since it won't show in O365 Sent Items
        $header .= "Reply-To: $fromName <$fromEmail>\r\n";
        $header .= "Subject: $subject\r\n";
        $header .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $header .= "\r\n";
        
        fputs($this->socket, $header . $body . "\r\n.\r\n");
        $this->getResponse();

        fputs($this->socket, "QUIT\r\n");
        fclose($this->socket);
        return true;
    }

    private function getResponse() {
        $resp = "";
        while ($line = fgets($this->socket, 515)) {
            $resp .= $line;
            if (substr($line, 3, 1) == " ") break;
        }
        return $resp;
    }
}

// --- 5. EXECUTE ---

// 5a. Persist to MySQL (non-blocking — email sends regardless)
try {
    require_once __DIR__ . '/api/db.php';
    $db = get_db();
    $stmt = $db->prepare(
        'INSERT INTO messages (sender_name, sender_email, body, status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $name,
        $email,
        $message,
        'unread',
        $_SERVER['REMOTE_ADDR']     ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null,
    ]);
    debug_log("Message persisted to DB (id=" . $db->lastInsertId() . ").");
} catch (Throwable $db_err) {
    debug_log("DB persist warning: " . $db_err->getMessage());
    // Non-fatal — continue to email relay
}

// 5b. Send via email relay
try {
    $smtp = new RelaySMTP();
    $smtp->send(
        "keith@macdaly.com",
        "MacDaly Contact",
        $email,
        "New Contact Submission: $name",
        "Name: $name\nEmail: $email\n\nMessage:\n$message\n\n---"
    );

    debug_log("Email sent SUCCESS via Relay with BCC.");
    echo json_encode(['message' => 'Thanks, your message has been sent.']);
} catch (Throwable $t) {
    debug_log("CRITICAL ERROR: " . $t->getMessage());
    echo json_encode(['message' => 'Service error: ' . $t->getMessage()]);
    http_response_code(500);
}
