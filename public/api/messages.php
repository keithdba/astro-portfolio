<?php
/**
 * messages.php — Messaging Inbox API
 *
 * MacDaly.com Admin Dashboard — PHP/MySQL Backend
 *
 * GET    /api/messages.php            — List all messages (with optional ?status= filter)
 * GET    /api/messages.php?id={id}    — Get a single message
 * PATCH  /api/messages.php            — Update message status (JSON: {id, status})
 * DELETE /api/messages.php            — Soft-delete (JSON: {id}) or hard-delete (?permanent=true)
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

session_set_cookie_params([
    'lifetime' => 86400,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

// -------------------------------------------------------
// Auth guard — ALL routes require an active admin session
// -------------------------------------------------------
if (empty($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// -------------------------------------------------------
// GET — List messages or get a single message
// -------------------------------------------------------
if ($method === 'GET') {
    try {
        $db = get_db();

        // Single message
        if (!empty($_GET['id'])) {
            $id = (int) $_GET['id'];
            $stmt = $db->prepare('SELECT * FROM messages WHERE id = ?');
            $stmt->execute([$id]);
            $msg = $stmt->fetch();

            if (!$msg) {
                json_response(['error' => 'Message not found'], 404);
            }

            // Auto-mark as read on open
            if ($msg['status'] === 'unread') {
                $db->prepare('UPDATE messages SET status = ?, updated_at = NOW() WHERE id = ?')
                   ->execute(['read', $id]);
                $msg['status'] = 'read';
            }

            json_response(['data' => $msg]);
        }

        // List with optional status filter
        $allowed_statuses = ['unread', 'read', 'archived', 'deleted'];
        $status_filter    = $_GET['status'] ?? null;

        if ($status_filter && !in_array($status_filter, $allowed_statuses, true)) {
            json_response(['error' => 'Invalid status filter'], 400);
        }

        $sql = 'SELECT id, sender_name, sender_email, LEFT(body, 120) AS excerpt, status, created_at
                FROM messages';

        $params = [];
        if ($status_filter) {
            $sql .= ' WHERE status = ?';
            $params[] = $status_filter;
        } else {
            // Default: exclude hard-deleted
            $sql .= " WHERE status != 'deleted'";
        }

        // Sort
        $allowed_sorts  = ['created_at', 'sender_name', 'status'];
        $sort_col       = in_array($_GET['sort'] ?? '', $allowed_sorts, true) ? $_GET['sort'] : 'created_at';
        $sort_dir       = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $sql .= " ORDER BY {$sort_col} {$sort_dir}";

        // Pagination
        $page     = max(1, (int) ($_GET['page'] ?? 1));
        $per_page = min(100, max(10, (int) ($_GET['per_page'] ?? 25)));
        $offset   = ($page - 1) * $per_page;
        $sql .= ' LIMIT ? OFFSET ?';
        $params[] = $per_page;
        $params[] = $offset;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $messages = $stmt->fetchAll();

        // Total count for pagination
        $count_sql = 'SELECT COUNT(*) FROM messages' . ($status_filter ? ' WHERE status = ?' : " WHERE status != 'deleted'");
        $count_params = $status_filter ? [$status_filter] : [];
        $total = (int) $db->prepare($count_sql)->execute($count_params) ? $db->query(
            'SELECT COUNT(*) FROM messages' . ($status_filter ? " WHERE status = '{$status_filter}'" : " WHERE status != 'deleted'")
        )->fetchColumn() : 0;

        json_response([
            'data'       => $messages,
            'total'      => $total,
            'page'       => $page,
            'per_page'   => $per_page,
            'total_pages' => (int) ceil($total / $per_page),
        ]);

    } catch (Throwable $e) {
        log_error('messages GET error: ' . $e->getMessage(), 'error', null, 'messages.php');
        json_response(['error' => 'Internal server error'], 500);
    }
}

// -------------------------------------------------------
// PATCH — Update message status
// -------------------------------------------------------
if ($method === 'PATCH') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int) ($body['id'] ?? 0);
    $status = $body['status'] ?? '';

    $allowed = ['unread', 'read', 'archived'];
    if (!$id || !in_array($status, $allowed, true)) {
        json_response(['error' => 'Valid message ID and status required'], 400);
    }

    try {
        $db = get_db();
        $stmt = $db->prepare('UPDATE messages SET status = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$status, $id]);

        if ($stmt->rowCount() === 0) {
            json_response(['error' => 'Message not found'], 404);
        }

        json_response(['message' => "Status updated to '{$status}'", 'id' => $id]);

    } catch (Throwable $e) {
        log_error('messages PATCH error: ' . $e->getMessage(), 'error', null, 'messages.php');
        json_response(['error' => 'Internal server error'], 500);
    }
}

// -------------------------------------------------------
// DELETE — Soft-delete (status=deleted) or hard delete
// -------------------------------------------------------
if ($method === 'DELETE') {
    $body      = json_decode(file_get_contents('php://input'), true);
    $id        = (int) ($body['id'] ?? 0);
    $permanent = filter_var($_GET['permanent'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

    if (!$id) {
        json_response(['error' => 'Message ID required'], 400);
    }

    try {
        $db = get_db();

        if ($permanent) {
            $stmt = $db->prepare('DELETE FROM messages WHERE id = ?');
            $stmt->execute([$id]);
        } else {
            $stmt = $db->prepare("UPDATE messages SET status = 'deleted', updated_at = NOW() WHERE id = ?");
            $stmt->execute([$id]);
        }

        if ($stmt->rowCount() === 0) {
            json_response(['error' => 'Message not found'], 404);
        }

        json_response(['message' => $permanent ? 'Message permanently deleted' : 'Message moved to trash', 'id' => $id]);

    } catch (Throwable $e) {
        log_error('messages DELETE error: ' . $e->getMessage(), 'error', null, 'messages.php');
        json_response(['error' => 'Internal server error'], 500);
    }
}

// -------------------------------------------------------
// POST — Restore a deleted message
// -------------------------------------------------------
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int) ($body['id'] ?? 0);

    if (!$id) {
        json_response(['error' => 'Message ID required'], 400);
    }

    try {
        $db = get_db();
        $stmt = $db->prepare("UPDATE messages SET status = 'read', updated_at = NOW() WHERE id = ? AND status = 'deleted'");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            json_response(['error' => 'Message not found or not in trash'], 404);
        }

        json_response(['message' => 'Message restored', 'id' => $id]);

    } catch (Throwable $e) {
        log_error('messages RESTORE error: ' . $e->getMessage(), 'error', null, 'messages.php');
        json_response(['error' => 'Internal server error'], 500);
    }
}

json_response(['error' => 'Method not allowed'], 405);
