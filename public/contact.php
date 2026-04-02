<?php
/**
 * MacDaly.com Contact Form Handler (Direct O365 Version via Port 465)
 * Uses SSL-secured SMTP to restore Microsoft "Sent Items" visibility.
 */

header('Content-Type: application/json');

// --- 1. SETTINGS & LOGGING ---
$log_buffer = [];
function debug_log($message) {
    global $log_buffer;
    $timestamp = date('H:i:s');
    $log_buffer[] = "[$timestamp] $message";
    
    $log_path = __DIR__ . '/contact_debug.log';
    @file_put_contents($log_path, "[" . date('Y-m-d H:i:s') . "] $message\n", FILE_APPEND);
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
    debug_log("Env loaded: " . count($env_vars) . " entries.");
} else {
    debug_log("CRIT: macdaly.env NOT FOUND at $path.");
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

// --- 4. AUTHENTICATED SMTP CLIENT (Direct Microsoft via SSL Port 465) ---
class DirectSMTP {
    private $socket;
    
    private function log($msg) { debug_log("SMTP: $msg"); }

    public function send($host, $port, $user, $pass, $fromName, $fromEmail, $to, $subject, $body) {
        $this->log("Connecting to $host:$port via SSL...");
        // Port 465 uses SSL directly (ssl:// required)
        $this->socket = fsockopen("ssl://$host", $port, $errno, $errstr, 20);
        if (!$this->socket) throw new Exception("Connection failed: $errstr ($errno)");

        $this->getResponse();
        $this->sendCommand("EHLO " . $_SERVER['SERVER_NAME']);
        
        $this->log("Authenticating as $user...");
        $this->sendCommand("AUTH LOGIN");
        $this->sendCommand(base64_encode($user));
        $this->sendCommand(base64_encode($pass));

        $this->sendCommand("MAIL FROM:<$user>");
        $this->sendCommand("RCPT TO:<$to>");
        $this->sendCommand("DATA");

        $header = "To: $to\r\n";
        $header .= "From: $fromName <$user>\r\n";
        $header .= "Reply-To: $fromName <$fromEmail>\r\n";
        $header .= "Subject: $subject\r\n";
        $header .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $header .= "\r\n";
        
        $this->sendCommand($header . $body . "\r\n.", 250);
        $this->sendCommand("QUIT");
        
        fclose($this->socket);
        return true;
    }

    private function sendCommand($cmd, $expectedCode = 0) {
        $this->log("Sent: " . (strpos($cmd, 'base64') || strpos($cmd, 'AUTH') ? "HIDDEN" : $cmd));
        fputs($this->socket, $cmd . "\r\n");
        return $this->getResponse($expectedCode);
    }

    private function getResponse($expectedCode = 0) {
        $resp = "";
        while ($line = fgets($this->socket, 515)) {
            $resp .= $line;
            if (substr($line, 3, 1) == " ") break;
        }
        $this->log("Received: " . trim($resp));
        return $resp;
    }
}

// --- 5. EXECUTE ---
try {
    $smtp_user = $env_vars['SMTP_USER'] ?? '';
    $smtp_pass = $env_vars['SMTP_PASSWORD'] ?? '';

    if (empty($smtp_user) || empty($smtp_pass)) {
        throw new Exception("SMTP credentials not found in env.");
    }

    $smtp = new DirectSMTP();
    $smtp->send(
        'smtp.office365.com',
        465,
        $smtp_user,
        $smtp_pass,
        "MacDaly Contact",
        $email,
        "keith@macdaly.com",
        "New Contact Submission: $name",
        "Name: $name\nEmail: $email\n\nMessage:\n$message\n\n---"
    );

    debug_log("Email sent SUCCESS via Direct SMTP.");
    echo json_encode(['message' => 'Thanks, your message has been sent.']);
} catch (Throwable $t) {
    global $log_buffer;
    debug_log("CRITICAL ERROR: " . $t->getMessage());
    echo json_encode([
        'message' => 'Service error: ' . $t->getMessage() . ' | LOG: ' . implode(' -> ', $log_buffer)
    ]);
    http_response_code(500);
}
