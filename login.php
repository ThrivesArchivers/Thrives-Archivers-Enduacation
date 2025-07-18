<?php
require 'config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email    = $_POST['email'];
    $password = $_POST['password'];

    // Fetch user from database
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        echo "✅ Login successful. Welcome, " . htmlspecialchars($user['full_name']) . "!";
        // You can start a session here if needed
        // session_start();
        // $_SESSION['user_id'] = $user['id'];
    } else {
        echo "❌ Invalid email or password.";
    }
}
?>

<!-- HTML Form -->
<form method="POST" action="login.php">
  <input type="email" name="email" placeholder="Email" required><br>
  <input type="password" name="password" placeholder="Password" required><br>
  <button type="submit">Login</button>
</form>
