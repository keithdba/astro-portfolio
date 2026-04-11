<?php
/**
 * logs.php — Error Logs Viewer API
 *
 * MacDaly.com Admin Dashboard — PHP/MySQL Backend
 *
 * GET /api/logs.php                            — List error logs (paginated)
 * GET /api/logs.php?id={id}                    — Get a single log entry
 * GET /api/logs.php?export=csv                 — Export all logs as CSV
 * GET /api/logs.php?export=json                — Export all logs as JSON
 * DELETE /api/logs.php                         — Delete a log entry (JSON: {id})
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

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

// Auth guard
if (empty($_SESSION['admin_id'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

function json_response(array $data, int $status = 200): void {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// -------------------------------------------------------
// GET — List, single, or export
// -------------------------------------------------------
if ($method === 'GET') {
    try {
        $db = get_db();

        // ------- Single log entry -------
        if (!empty($_GET['id'])) {
            $stmt = $db->prepare('SELECT * FROM error_logs WHERE id = ?');
            $stmt->execute([(int) $_GET['id']]);
            $log = $stmt->fetch();

            if (!$log) json_response(['error' => 'Log entry not found'], 404);

            // Parse JSON context
            if ($log['context']) {
                $log['context'] = json_decode($log['context'], true);
            }

            json_response(['data' => $log]);
        }

        // ------- Export -------
        $export = $_GET['export'] ?? null;
        if ($export) {
            $allowed_levels = ['debug', 'info', 'warning', 'error', 'critical'];
            $level_filter = $_GET['level'] ?? null;

            $sql    = 'SELECT * FROM error_logs';
            $params = [];
            if ($level_filter && in_array($level_filter, $allowed_levels, true)) {
                $sql .= ' WHERE level = ?';
                $params[] = $level_filter;
            }
            $sql .= ' ORDER BY timestamp DESC LIMIT 5000';

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            if ($export === 'csv') {
                header('Content-Type: text/csv; charset=UTF-8');
                header('Content-Disposition: attachment; filename="error-logs-' . date('Y-m-d') . '.csv"');
                $out = fopen('php://output', 'w');
                fputcsv($out, ['id', 'level', 'message', 'context', 'source', 'timestamp']);
                foreach ($rows as $row) {
                    fputcsv($out, [
                        $row['id'],
                        $row['level'],
                        $row['message'],
                        $row['context'],
                        $row['source'],
                        $row['timestamp'],
                    ]);
                }
                fclose($out);
                exit;
            }

            if ($export === 'json') {
                header('Content-Type: application/json');
                header('Content-Disposition: attachment; filename="error-logs-' . date('Y-m-d') . '.json"');
                foreach ($rows as &$row) {
                    if ($row['context']) $row['context'] = json_decode($row['context'], true);
                }
                echo json_encode(['exported_at' => date('c'), 'count' => count($rows), 'data' => $rows], JSON_PRETTY_PRINT);
                exit;
            }

            json_response(['error' => 'Invalid export format. Use ?export=csv or ?export=json'], 400);
        }

        // ------- Paginated list -------
        $allowed_levels = ['debug', 'info', 'warning', 'error', 'critical'];
        $level_filter   = $_GET['level'] ?? null;

        $where  = '';
        $params = [];
        if ($level_filter && in_array($level_filter, $allowed_levels, true)) {
            $where    = 'WHERE level = ?';
            $params[] = $level_filter;
        }

        $page     = max(1, (int) ($_GET['page'] ?? 1));
        $per_page = min(200, max(10, (int) ($_GET['per_page'] ?? 50)));
        $offset   = ($page - 1) * $per_page;

        $stmt = $db->prepare("SELECT * FROM error_logs {$where} ORDER BY timestamp DESC LIMIT ? OFFSET ?");
        $params[] = $per_page;
        $params[] = $offset;
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        // Decode JSON context fields
        foreach ($logs as &$log) {
            if ($log['context']) $log['context'] = json_decode($log['context'], true);
        }

        $total = (int) $db->query(
            "SELECT COUNT(*) FROM error_logs" . ($level_filter ? " WHERE level = '{$level_filter}'" : '')
        )->fetchColumn();

        json_response([
            'data'        => $logs,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $per_page,
            'total_pages' => (int) ceil($total / $per_page),
        ]);

    } catch (Throwable $e) {
        log_error('logs GET error: ' . $e->getMessage(), 'error', null, 'logs.php');
        json_response(['error' => 'Internal server error'], 500);
    }
}

// -------------------------------------------------------
// DELETE — Remove a log entry
// -------------------------------------------------------
if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int) ($body['id'] ?? 0);

    if (!$id) {
        json_response(['error' => 'Log entry ID required'], 400);
    }

    try {
        $db   = get_db();
        $stmt = $db->prepare('DELETE FROM error_logs WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            json_response(['error' => 'Log entry not found'], 404);
        }

        json_response(['message' => 'Log entry deleted', 'id' => $id]);

    } catch (Throwable $e) {
        log_error('logs DELETE error: ' . $e->getMessage(), 'error', null, 'logs.php');
        json_response(['error' => 'Internal server error'], 500);
    }
}

header('Content-Type: application/json');
json_response(['error' => 'Method not allowed'], 405);
