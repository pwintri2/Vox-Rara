<?php
// ==============================================================================
// api.php - Backend voor Ledenmodule passend bij Strato (FastCGI/PHP)
// Deze ene file vervangt de Python routing endpoints (app.py) voor 100% PHP support.
//
// Configuratie qua veiligheid:
// - Gebruikt PDO Prepared statements voor MariaDB
// - Slaat bestanden op in __DIR__ . "/data/leden/uploads"; map moet CHMOD 755/777 hebben.
// - Tokens worden in memory simulaties via sessions behandeld om Strato werkend te houden.
// ==============================================================================

require_once __DIR__ . '/db_config.php';

// Zorg voor session support ter vervanging van de `TOKENS` array uit Python
session_start();

// Header instructies
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS requests for Fetch API
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helpmiddelen
function send_json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function safe_filename($name) {
    $name = basename($name);
    return preg_replace('/[^A-Za-z0-9.\-_ ]/', '', $name);
}

function safe_id($name) {
    $name = strtolower(trim($name));
    $name = preg_replace('/\s+/', '-', $name);
    return preg_replace('/[^a-z0-9\-_]/', '', $name);
}

// Bepaal de actie van de URL request - strato URL structuur: api.php?action=login
$action = $_GET['action'] ?? '';

$db = get_db_connection();

// Haal de token uit de Authorization header (Robuust voor Strato Basic / FastCGI)
function get_bearer_token() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

// ----------------------------------------------------------------------------
// Authenticatie controles
// ----------------------------------------------------------------------------
function require_leden_view() {
    $token = get_bearer_token();
    if ($token && isset($_SESSION['token']) && $_SESSION['token'] === $token && !empty($_SESSION['leden_view'])) return;
    if (isset($_SESSION['admin']) && $_SESSION['admin'] === true) return;
    send_json(["detail" => "No access format required"], 403);
}

function require_leden_manage() {
    $token = get_bearer_token();
    if ($token && isset($_SESSION['token']) && $_SESSION['token'] === $token && !empty($_SESSION['leden_manage'])) return;
    if (isset($_SESSION['admin']) && $_SESSION['admin'] === true) return;
    send_json(["detail" => "No access manage required"], 403);
}

function require_admin() {
    $token = get_bearer_token();
    // Als we in PHP de admin "token" in de session bewaren als auth match
    if ($token && isset($_SESSION['admin_token']) && $_SESSION['admin_token'] === $token) return;
    if (isset($_SESSION['admin']) && $_SESSION['admin'] === true) return;
    send_json(["detail" => "Missing admin token"], 401);
}

function get_admin_password() {
    if (defined('LEDEN_ADMIN_PASSWORD') && LEDEN_ADMIN_PASSWORD !== '') {
        return LEDEN_ADMIN_PASSWORD;
    }
    $env_password = getenv('LEDEN_ADMIN_PASSWORD');
    return $env_password ?: null;
}

// ----------------------------------------------------------------------------
// Routing Endpoints
// ----------------------------------------------------------------------------

$body = json_decode(file_get_contents('php://input'), true);

switch ($action) {

    // POST /api/login (Simulatie admin login)
    case 'adminLogin':
        $pass = $body['password'] ?? '';
        $admin_password = get_admin_password();

        if (!$admin_password) {
            send_json(["detail" => "Admin password is not configured"], 500);
        }

        if (hash_equals($admin_password, $pass)) {
            $_SESSION['admin'] = true;
            $token = bin2hex(random_bytes(16));
            $_SESSION['admin_token'] = $token;
            send_json(["token" => $token]);
        } else {
            send_json(["detail" => "Invalid password"], 401);
        }
        break;

    // POST /api/leden/login
    case 'ledenLogin':
        $code = $body['code'] ?? '';
        
        $stmt = $db->prepare("SELECT label, leden_view, leden_manage, actief FROM leden_access_codes WHERE code = ? AND actief = 1");
        $stmt->execute([$code]);
        $row = $stmt->fetch();
        
        if (!$row) {
            send_json(["detail" => "Invalid code"], 401);
        }
        
        // Simuleer in memory opslag (naast de JSON web tokens in Python structuur, gebruiken we Sessions in PHP).
        $token = bin2hex(random_bytes(16));
        $_SESSION['token'] = $token;
        $_SESSION['leden_view'] = (bool)$row['leden_view'];
        $_SESSION['leden_manage'] = (bool)$row['leden_manage'];
        $_SESSION['label'] = $row['label'];
        
        send_json([
            "token" => $token,
            "leden_view" => $_SESSION['leden_view'],
            "leden_manage" => $_SESSION['leden_manage']
        ]);
        break;

    // GET /api/leden/items
    case 'ledenItems':
        require_leden_view();
        
        $status = $_GET['status'] ?? 'member';
        
        if ($status === 'pending') {
            require_leden_manage();
        }
        
        $stmt = $db->prepare("SELECT id, naam, email, stem, motivatie, status, aangemaakt_op, goedgekeurd_op FROM leden_submissions WHERE status = ? ORDER BY aangemaakt_op DESC");
        $stmt->execute([$status]);
        $submissions = $stmt->fetchAll();
        
        $out = [];
        foreach ($submissions as $sub) {
            // Haal bestanden op
            $fStmt = $db->prepare("SELECT bestandsnaam, pad, mime_type FROM leden_submission_files WHERE submission_id = ?");
            $fStmt->execute([$sub['id']]);
            $filesResult = $fStmt->fetchAll();
            
            $bestanden = [];
            foreach ($filesResult as $fr) {
                $bestanden[] = ["naam" => $fr['bestandsnaam'], "pad" => $fr['pad']];
            }
            
            $out[] = [
                "id" => $sub['id'],
                "naam" => $sub['naam'],
                "email" => $sub['email'],
                "stem" => $sub['stem'],
                "motivatie" => $sub['motivatie'],
                "status" => $sub['status'],
                "created_at" => $sub['aangemaakt_op'],
                "approved_at" => $sub['goedgekeurd_op'],
                "bestanden" => $bestanden
            ];
        }
        
        send_json(["items" => $out]);
        break;

    // POST /api/leden/approve/{id}
    case 'ledenApprove':
        require_leden_manage();
        $item_id = safe_id($_GET['id'] ?? '');
        
        $stmt = $db->prepare("UPDATE leden_submissions SET status = 'member', goedgekeurd_op = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$item_id]);
        
        if ($stmt->rowCount() === 0) {
            send_json(["detail" => "Not found"], 404);
        }
        send_json(["ok" => true]);
        break;

    // POST /api/leden/delete/{id}
    case 'ledenDelete':
        require_leden_manage();
        $item_id = safe_id($_GET['id'] ?? '');
        
        $stmt = $db->prepare("DELETE FROM leden_submissions WHERE id = ?");
        $stmt->execute([$item_id]);
        
        if ($stmt->rowCount() === 0) {
            send_json(["detail" => "Not found"], 404);
        }
        
        // Verwijder folder recursief
        $folder = __DIR__ . '/data/leden/uploads/' . $item_id;
        if (is_dir($folder)) {
            $files = glob($folder . '/*');
            foreach ($files as $file) {
                if (is_file($file)) unlink($file);
            }
            rmdir($folder);
        }
        
        send_json(["ok" => true]);
        break;

    // POST /api/leden/access/upsert
    case 'ledenAccessUpsert':
        require_admin();
        $label = trim($body['label'] ?? '');
        $code = trim($body['code'] ?? '');
        $view = empty($body['leden_view']) ? 0 : 1;
        $manage = empty($body['leden_manage']) ? 0 : 1;
        
        if (!$label || !$code) {
            send_json(["detail" => "label and code required"], 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO leden_access_codes (label, code, leden_view, leden_manage, actief)
            VALUES (?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
                code = VALUES(code),
                leden_view = VALUES(leden_view),
                leden_manage = VALUES(leden_manage),
                actief = VALUES(actief)
        ");
        $stmt->execute([$label, $code, $view, $manage]);
        send_json(["ok" => true]);
        break;

    // GET /api/leden/access
    case 'ledenAccessList':
        require_admin();
        $stmt = $db->query("SELECT label, code, leden_view, leden_manage, actief FROM leden_access_codes ORDER BY label ASC");
        send_json(["codes" => $stmt->fetchAll()]);
        break;

    // POST /api/leden/access/delete
    case 'ledenAccessDelete':
        require_admin();
        $label = trim($_GET['label'] ?? '');
        $stmt = $db->prepare("DELETE FROM leden_access_codes WHERE label = ?");
        $stmt->execute([$label]);
        send_json(["ok" => true, "deleted" => $stmt->rowCount()]);
        break;

    // POST /api/leden/aanmelden
    case 'ledenAanmelden':
        $naam = $_POST['naam'] ?? '';
        $email = $_POST['email'] ?? '';
        $stem = $_POST['stem'] ?? '';
        $motivatie = $_POST['motivatie'] ?? '';
        
        $safe_id = 'leden-' . bin2hex(random_bytes(4));
        
        // 1. Database insert
        $stmt = $db->prepare("INSERT INTO leden_submissions (id, naam, email, stem, motivatie, status) VALUES (?, ?, ?, ?, ?, 'pending')");
        $stmt->execute([$safe_id, $naam, $email, $stem, $motivatie]);
        
        // 2. Files verwerken
        $upload_dir = __DIR__ . '/data/leden/uploads/' . $safe_id . '/';
        if (!is_dir($upload_dir)) {
            @mkdir($upload_dir, 0755, true);
        }
        
        $files = $_FILES['bestanden'] ?? []; 
        if (!empty($files['name']) && is_array($files['name'])) {
            $file_count = count($files['name']);
            for ($i = 0; $i < $file_count; $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $secure_name = safe_filename($files['name'][$i]);
                    $disk_path = $upload_dir . $secure_name;
                    $mime_type = function_exists('mime_content_type') ? @mime_content_type($files['tmp_name'][$i]) : 'application/octet-stream';
                    if (!$mime_type) $mime_type = 'application/octet-stream';
                    
                    if (@move_uploaded_file($files['tmp_name'][$i], $disk_path)) {
                        $rel = $safe_id . '/' . $secure_name;
                        $fStmt = $db->prepare("INSERT INTO leden_submission_files (submission_id, bestandsnaam, pad, mime_type) VALUES (?, ?, ?, ?)");
                        $fStmt->execute([$safe_id, $secure_name, $rel, $mime_type]);
                    }
                }
            }
        }
        
        // Verwerk foto indien los
        $foto = $_FILES['foto'] ?? null;
        if ($foto && is_array($foto) && $foto['error'] === UPLOAD_ERR_OK) {
            $secure_name = safe_filename($foto['name']);
            $disk_path = $upload_dir . $secure_name;
            $mime_type = function_exists('mime_content_type') ? @mime_content_type($foto['tmp_name']) : 'image/jpeg';
            if (!$mime_type) $mime_type = 'image/jpeg';
            
            if (@move_uploaded_file($foto['tmp_name'], $disk_path)) {
                $rel = $safe_id . '/' . $secure_name;
                $fStmt = $db->prepare("INSERT INTO leden_submission_files (submission_id, bestandsnaam, pad, mime_type) VALUES (?, ?, ?, ?)");
                $fStmt->execute([$safe_id, $secure_name, $rel, $mime_type]);
            }
        }
        
        send_json(["ok" => true, "id" => $safe_id]);
        break;

    // GET /api/leden/download
    case 'ledenDownload':
        require_leden_view();
        $id = safe_id($_GET['id'] ?? '');
        $fname = safe_filename($_GET['filename'] ?? '');
        
        $path = __DIR__ . "/data/leden/uploads/{$id}/{$fname}";
        if (file_exists($path)) {
            header('Content-Description: File Transfer');
            header('Content-Type: ' . mime_content_type($path));
            header('Content-Disposition: inline; filename="' . basename($path) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize($path));
            readfile($path);
            exit;
        } else {
            send_json(["detail" => "File not found"], 404);
        }
        break;

    default:
        send_json(["detail" => "API endpoint not found in PHP logic"], 404);
}
