<?php
/**
 * MacDaly.com Contact Form Handler (PHP SMTP Version)
 * Uses authenticated SMTP (Office 365) for reliable delivery on GoDaddy.
 */

header('Content-Type: application/json');

// --- 1. SETTINGS & LOGGING ---
$log_path = 'contact_debug.log';
function debug_log($message) {
    global $log_path;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($log_path, "[$timestamp] $message\n", FILE_APPEND);
}

debug_log(">>> New submission request received.");

// --- 2. LOAD ENVIRONMENT VARIABLES ---
$env_path = '/home/rsa1bm8j8le5/.env';
$env_vars = [];

// Deep Diagnostics
debug_log("DIAGNOSTICS: Script running as user '" . get_current_user() . "'");
debug_log("DIAGNOSTICS: Current directory is '" . getcwd() . "'");
debug_log("DIAGNOSTICS: open_basedir is '" . ini_get('open_basedir') . "'");
debug_log("DIAGNOSTICS: Assessing $env_path...");
debug_log("DIAGNOSTICS: file_exists? " . (file_exists($env_path) ? 'YES' : 'NO'));
debug_log("DIAGNOSTICS: is_readable? " . (is_readable($env_path) ? 'YES' : 'NO'));

if (file_exists($env_path) && is_readable($env_path)) {
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $env_vars[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
    debug_log("Environment loaded successfully. Found " . count($env_vars) . " variables.");
} else {
    debug_log("CRITICAL ERROR: .env file NOT READABLE at $env_path.");
}

// --- 3. GET FORM DATA ---
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    debug_log("ERROR: Invalid JSON received.");
    echo json_encode(['message' => 'Invalid request data.']);
    http_response_code(400); exit;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$message = trim($data['message'] ?? '');
$honeypot = trim($data['honeypot'] ?? '');

if (empty($name) || empty($email) || empty($message)) {
    debug_log("ERROR: Validation failed (empty fields).");
    echo json_encode(['message' => 'Validation failed: All fields are required.']);
    http_response_code(400); exit;
}

if (!empty($honeypot)) {
    debug_log("Honeypot triggered (bot suspected). Silently ignoring.");
    echo json_encode(['message' => 'Success']);
    http_response_code(200); exit;
}

// --- 4. AUTHENTICATED SMTP CLIENT (Office 365) ---
class SimpleSMTP {
    private $socket;
    private $logs = [];

    public function log($msg) { 
        $this->logs[] = $msg;
        debug_log("SMTP: $msg");
    }

    public function send($host, $port, $user, $pass, $fromName, $fromEmail, $to, $subject, $body) {
        $this->log("Connecting to $host:$port...");
        $this->socket = fsockopen($host, $port, $errno, $errstr, 30);
        if (!$this->socket) throw new Exception("Connection failed: $errstr ($errno)");

        $this->getResponse();
        $this->sendCommand("EHLO " . $_SERVER['SERVER_NAME']);
        
        $this->log("Starting TLS...");
        $this->sendCommand("STARTTLS");
        if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception("TLS encryption failed.");
        }

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

// --- 5. EXECUTE SEND ---
try {
    $smtp = new SimpleSMTP();
    $smtp_user = $env_vars['SMTP_USER'] ?? '';
    $smtp_pass = $env_vars['SMTP_PASSWORD'] ?? '';

    if (empty($smtp_user) || empty($smtp_pass)) {
        throw new Exception("SMTP credentials not found in environment.");
    }

    $smtp->send(
        'smtp.office365.com',
        587,
        $smtp_user,
        $smtp_pass,
        "MacDaly Contact",
        $email,
        "keith@macdaly.com",
        "New Contact Submission: $name",
        "Name: $name\nEmail: $email\n\nMessage:\n$message\n\n---"
    );

    debug_log("Email sent SUCCESSFULLY.");
    echo json_encode(['message' => 'Thanks, your message has been sent.']);
} catch (Throwable $t) {
    debug_log("CRITICAL ERROR: " . $t->getMessage());
    debug_log("Stack trace: " . $t->getTraceAsString());
    echo json_encode(['message' => 'Service error: ' . $t->getMessage()]);
    http_response_code(500);
}
