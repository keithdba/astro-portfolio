<?php
/**
 * auth.php — Admin Authentication API
 *
 * MacDaly.com Admin Dashboard — PHP/MySQL Backend
 *
 * POST /api/auth.php        — Login (JSON body: {username, password})
 * GET  /api/auth.php        — Session status check
 * DELETE /api/auth.php      — Logout
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// -------------------------------------------------------
// Session bootstrap (secure cookie settings)
// -------------------------------------------------------
session_set_cookie_params([
    'lifetime' => 86400,       // 24 hours
    'path'     => '/',
    'secure'   => true,        // HTTPS only
    'httponly' => true,        // No JS access
    'samesite' => 'Strict',
]);
session_start();

// -------------------------------------------------------
// CORS: only allow same origin
// -------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origin = 'https://macdaly.com';
if ($origin === $allowed_origin) {
    header("Access-Control-Allow-Origin: {$allowed_origin}");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -------------------------------------------------------
// Rate-limiting constants
// -------------------------------------------------------
const MAX_ATTEMPTS    = 5;
const LOCKOUT_SECONDS = 900; // 15 minutes

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_session(): array {
    if (empty($_SESSION['admin_id'])) {
        json_response(['error' => 'Unauthorized'], 401);
    }
    return $_SESSION;
}

// -------------------------------------------------------
// Route: GET — session status check
// -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_SESSION['admin_id'])) {
        json_response([
            'authenticated' => true,
            'admin_id'      => $_SESSION['admin_id'],
            'username'      => $_SESSION['username'] ?? '',
        ]);
    }
    json_response(['authenticated' => false], 401);
}

// -------------------------------------------------------
// Route: DELETE — logout
// -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    require_session();
    $_SESSION = [];
    session_destroy();
    setcookie(session_name(), '', time() - 3600, '/', '', true, true);
    json_response(['message' => 'Logged out successfully']);
}

// -------------------------------------------------------
// Route: POST — login
// -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    $username = strtolower(trim($body['username'] ?? ''));
    $password = $body['password'] ?? '';

    if (empty($username) || empty($password)) {
        json_response(['error' => 'Username and password are required'], 400);
    }

    try {
        $db = get_db();

        // Fetch admin record
        $stmt = $db->prepare('SELECT * FROM admins WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if (!$admin) {
            // Consistent timing to prevent username enumeration
            password_verify($password, '$2y$12$invalidhashinvalidhashinvalidhashXXX');
            log_error("Login failed: unknown username [{$username}]", 'warning', null, 'auth.php');
            json_response(['error' => 'Invalid credentials'], 401);
        }

        // Check lockout
        if (!empty($admin['locked_until']) && new DateTime() < new DateTime($admin['locked_until'])) {
            $locked_until = $admin['locked_until'];
            json_response([
                'error'        => 'Account temporarily locked due to too many failed attempts.',
                'locked_until' => $locked_until,
            ], 429);
        }

        // Verify password
        if (!password_verify($password, $admin['password_hash'])) {
            $attempts = (int)$admin['failed_attempts'] + 1;
            $locked_until = null;

            if ($attempts >= MAX_ATTEMPTS) {
                $locked_until = (new DateTime())->modify('+' . LOCKOUT_SECONDS . ' seconds')->format('Y-m-d H:i:s');
                log_error("Account locked: {$username} after {$attempts} failed attempts", 'warning', null, 'auth.php');
            }

            $db->prepare('UPDATE admins SET failed_attempts = ?, locked_until = ?, updated_at = NOW() WHERE id = ?')
               ->execute([$attempts, $locked_until, $admin['id']]);

            json_response(['error' => 'Invalid credentials'], 401);
        }

        // Successful login — reset counters
        $db->prepare('UPDATE admins SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() WHERE id = ?')
           ->execute([$admin['id']]);

        // Regenerate session ID (session fixation protection)
        session_regenerate_id(true);

        $_SESSION['admin_id']  = $admin['id'];
        $_SESSION['username']  = $admin['username'];
        $_SESSION['logged_in_at'] = time();

        log_error("Login success: {$username}", 'info', null, 'auth.php');

        json_response([
            'message'  => 'Login successful',
            'username' => $admin['username'],
        ]);

    } catch (Throwable $e) {
        log_error('Login exception: ' . $e->getMessage(), 'error', null, 'auth.php');
        json_response(['error' => 'Internal server error'], 500);
    }
}

json_response(['error' => 'Method not allowed'], 405);
