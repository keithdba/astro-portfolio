#!/usr/bin/env php
<?php
/**
 * bootstrap-admin.php — Admin Account Setup Script
 *
 * MacDaly.com Admin Dashboard — PHP/MySQL Backend
 *
 * Run this ONCE from the command line after the schema has been applied:
 *   php scripts/bootstrap-admin.php
 *
 * It will prompt for a username and password, then insert the first
 * admin record into the database using PHP's secure bcrypt hashing.
 *
 * SECURITY: Delete or move this file after use. Never expose it publicly.
 */

declare(strict_types=1);

// --- Locate project root and load db utility ---
$script_dir  = dirname(__DIR__) . '/public';
$_SERVER['DOCUMENT_ROOT'] = $script_dir;

require_once dirname(__DIR__) . '/public/api/db.php';

// --- Only runnable from CLI ---
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script must be run from the command line.');
}

echo "\n=== MacDaly.com Admin Bootstrap ===\n\n";

// --- Prompt for username ---
echo "Enter admin username: ";
$username = trim((string) fgets(STDIN));
if (empty($username)) {
    exit("Error: Username cannot be empty.\n");
}
if (strlen($username) < 3 || strlen($username) > 50) {
    exit("Error: Username must be between 3 and 50 characters.\n");
}

// --- Prompt for password (hidden) ---
echo "Enter admin password: ";
// Disable echo for password input on Unix systems
system('stty -echo');
$password = trim((string) fgets(STDIN));
system('stty echo');
echo "\nConfirm password: ";
system('stty -echo');
$password_confirm = trim((string) fgets(STDIN));
system('stty echo');
echo "\n";

if (empty($password)) {
    exit("Error: Password cannot be empty.\n");
}
if (strlen($password) < 12) {
    exit("Error: Password must be at least 12 characters long.\n");
}
if ($password !== $password_confirm) {
    exit("Error: Passwords do not match.\n");
}

// --- Check for existing admins ---
try {
    $db = get_db();
    $count = (int) $db->query('SELECT COUNT(*) FROM admins')->fetchColumn();

    if ($count > 0) {
        echo "Warning: An admin account already exists.\n";
        echo "Do you want to add another admin? [y/N]: ";
        $confirm = strtolower(trim((string) fgets(STDIN)));
        if ($confirm !== 'y') {
            exit("Aborted. No changes made.\n");
        }
    }

    // --- Insert admin record ---
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $db->prepare(
        'INSERT INTO admins (username, password_hash) VALUES (:username, :password_hash)'
    );
    $stmt->execute([
        ':username'      => strtolower($username),
        ':password_hash' => $hash,
    ]);

    echo "\n✅ Admin account created successfully!\n";
    echo "   Username: {$username}\n";
    echo "   You can now log in at: https://macdaly.com/admin/login\n\n";
    echo "⚠️  IMPORTANT: Delete this script after use.\n\n";

} catch (Throwable $e) {
    exit("Database error: " . $e->getMessage() . "\n");
}
