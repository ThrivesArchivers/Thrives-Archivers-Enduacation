<?php
require 'config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $full_name = $_POST['full_name'];
    $email     = $_POST['email'];
    $password  = password_hash($_POST['password'], PASSWORD_DEFAULT); // Securely hash the password

    // Check if user already exists
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo "❌ Email already exists.";
        exit;
    }

    // Insert new user
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)");
    if ($stmt->execute([$full_name, $email, $password])) {
        echo "✅ Registration successful!";
    } else {
        echo "❌ Registration failed.";
    }
}
?>

<!-- HTML Form -->
<form method="POST" action="register.php">
  <input type="text" name="full_name" placeholder="Full Name" required><br>
  <input type="email" name="email" placeholder="Email" required><br>
  <input type="password" name="password" placeholder="Password" required><br>
  <button type="submit">Register</button>
</form>
