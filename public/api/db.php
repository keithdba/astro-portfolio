<?php
/**
 * db.php — PDO Database Connection Utility
 *
 * MacDaly.com Admin Dashboard — PHP/MySQL Backend
 * Loaded by all /api/*.php scripts via require_once.
 *
 * Reads credentials from macdaly.env (one level above public_html).
 * Never expose this file or its contents publicly.
 */

declare(strict_types=1);

/**
 * Load key=value pairs from a .env-style file.
 * Returns an associative array of all parsed variables.
 */
function load_env(string $path): array {
    $vars = [];
    if (!file_exists($path) || !is_readable($path)) {
        return $vars;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (str_contains($line, '=')) {
            [$name, $value] = explode('=', $line, 2);
            $vars[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
    return $vars;
}

/**
 * Return a PDO connection to the MacDaly MySQL database.
 * Throws a RuntimeException if connection fails.
 */
function get_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // Locate macdaly.env one level above public_html (e.g. /home/user/macdaly.env)
    $env_path = dirname($_SERVER['DOCUMENT_ROOT'] ?? getcwd()) . '/macdaly.env';
    $env = load_env($env_path);

    $host   = $env['DB_HOST']     ?? 'localhost';
    $port   = $env['DB_PORT']     ?? '3306';
    $dbname = $env['DB_NAME']     ?? '';
    $user   = $env['DB_USER']     ?? '';
    $pass   = $env['DB_PASSWORD'] ?? '';

    if (empty($dbname) || empty($user)) {
        throw new RuntimeException('Database credentials not configured in macdaly.env');
    }

    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}

/**
 * Write an error event to the error_logs table.
 * Silently fails (no exception) to prevent cascading errors.
 */
function log_error(string $message, string $level = 'error', ?array $context = null, string $source = ''): void {
    try {
        $db = get_db();
        $stmt = $db->prepare(
            'INSERT INTO error_logs (level, message, context, source) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $level,
            $message,
            $context ? json_encode($context, JSON_UNESCAPED_UNICODE) : null,
            $source,
        ]);
    } catch (Throwable) {
        // Silently ignore — avoid infinite loops on DB failure
    }
}
