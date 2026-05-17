<?php
/**
 * api_scores.php
 * Geoptimaliseerd voor Strato Basic Hosting!
 */

header('Content-Type: application/json');

// --- Database connectie ---
// Zet echte gegevens in scores_config.php op de server, of gebruik environment
// variables. scores_config.php staat bewust in .gitignore.
$localConfigPath = __DIR__ . '/scores_config.php';
$localConfig = file_exists($localConfigPath) ? require $localConfigPath : [];

$host = getenv('SCORES_DB_HOST') ?: ($localConfig['host'] ?? '');
$db = getenv('SCORES_DB_NAME') ?: ($localConfig['database'] ?? '');
$user = getenv('SCORES_DB_USER') ?: ($localConfig['user'] ?? '');
$pass = getenv('SCORES_DB_PASS') ?: ($localConfig['password'] ?? '');
$charset = getenv('SCORES_DB_CHARSET') ?: ($localConfig['charset'] ?? 'utf8mb4');

if (!$host || !$db || !$user || !$pass) {
    echo json_encode([
        'success' => false,
        'error' => 'Databaseconfiguratie ontbreekt. Maak oefenen/scores_config.php op basis van scores_config.example.php.'
    ]);
    exit;
}

// --- Veilig Opslaan op Strato ---
// __DIR__ is exact de map waar api_scores.php staat (dus /home/oefenen/). 
// We maken hier netjes een 'scores' submap in aan.
$uploadDir = __DIR__ . '/scores/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Setup Database via PDO MySQL (actief!)
try {
    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $options =[
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Voor de zekerheid: als de tabel nog niet bestaat op de Strato DB, maakt hij hem aan.
    $pdo->exec("CREATE TABLE IF NOT EXISTS scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

} catch (\PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connectie is mislukt. Controleer de serverconfiguratie.']);
    exit;
}

$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        try {
            $stmt = $pdo->query('SELECT id, title, filename, uploaded_at FROM scores ORDER BY uploaded_at DESC');
            $scores = $stmt->fetchAll();
            echo json_encode(['success' => true, 'scores' => $scores]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'upload':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['success' => false, 'error' => 'Geen POST request.']);
            exit;
        }

        if (!isset($_FILES['scoreFile']) || $_FILES['scoreFile']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'error' => 'Bestand uploadfout.']);
            exit;
        }

        $file = $_FILES['scoreFile'];
        $title = isset($_POST['title']) && trim($_POST['title']) !== '' ? trim($_POST['title']) : pathinfo($file['name'], PATHINFO_FILENAME);
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        // Controleer of de extensie is toegestaan
        if (!in_array($ext, ['xml', 'mxl', 'musicxml'])) {
            echo json_encode(['success' => false, 'error' => 'Onjuist bestand. Alleen XML, MXL of MusicXML toegestaan.']);
            exit;
        }

        // Unieke veilige bestandsnaam
        $safeFilename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '', basename($file['name']));
        $destination = $uploadDir . $safeFilename;

        if (move_uploaded_file($file['tmp_name'], $destination)) {
            try {
                $stmt = $pdo->prepare('INSERT INTO scores (title, filename) VALUES (?, ?)');
                $stmt->execute([$title, $safeFilename]);
                echo json_encode(['success' => true, 'message' => 'Succesvol opgeslagen', 'id' => $pdo->lastInsertId()]);
            } catch (Exception $e) {
                // Als het in de database opslaan faalt, wis dan ook het net geüploade bestand weer.
                unlink($destination);
                echo json_encode(['success' => false, 'error' => 'Database fout: ' . $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Kon bestand niet verplaatsen naar: ' . $uploadDir]);
        }
        break;

    case 'download':
        $filename = $_GET['file'] ?? '';
        if (empty($filename)) {
            http_response_code(400);
            echo 'Geen bestand opgegeven.';
            exit;
        }

        // Beveiliging: voorkom dat men buiten de scores map leest (directory traversal block)
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false) {
            http_response_code(400);
            echo 'Ongeldige bestandsnaam.';
            exit;
        }

        $filepath = $uploadDir . $filename;
        if (file_exists($filepath)) {
            // Zeer belangrijk: Correcte MXL ZIP headers!
            $ext = strtolower(pathinfo($filepath, PATHINFO_EXTENSION));
            $contentType = ($ext === 'mxl') ? 'application/vnd.recordare.musicxml' : 'text/xml';

            header("Content-Type: $contentType");
            header('Content-Disposition: inline; filename="' . basename($filepath) . '"');
            header('Content-Length: ' . filesize($filepath));
            readfile($filepath);
            exit;
        } else {
            http_response_code(404);
            echo 'Bestand niet gevonden op de server.';
            exit;
        }

    default:
        echo json_encode(['success' => false, 'error' => 'Onbekende actie.']);
        break;
}
