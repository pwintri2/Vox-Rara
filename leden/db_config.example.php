<?php
// Copy this file to db_config.php on the server and fill in the real database
// values there. Do not commit db_config.php because it contains credentials.

define('DB_HOST', 'localhost');
define('DB_USER', 'database_user');
define('DB_PASS', 'database_password');
define('DB_NAME', 'database_name');
define('LEDEN_ADMIN_PASSWORD', 'change_this_admin_password');

function get_db_connection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
        return $pdo;
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["detail" => "Databaseverbinding mislukt. Controleer de serverconfiguratie."]);
        exit;
    }
}
?>
