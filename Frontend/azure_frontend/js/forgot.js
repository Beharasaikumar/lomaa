let userEmail = "";

// 📧 Send Verification Code
function sendCode() {
    userEmail = document.getElementById("email").value;
    fetch("http://localhost:4000/azu-send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            document.getElementById("step1").style.display = "none";
            document.getElementById("step2").style.display = "block";
        }
    })
    .catch(error => console.error("Error:", error));
}

// ✅ Verify Code
function verifyCode() {
    const code = document.getElementById("code").value;
    fetch("http://localhost:4000/azu-verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, code: code })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            document.getElementById("step2").style.display = "none";
            document.getElementById("step3").style.display = "block";
        }
    })
    .catch(error => console.error("Error:", error));
}

// 🔐 Reset Password
function resetPassword() {
    const newPassword = document.getElementById("newPassword").value;
    fetch("http://localhost:4000/azu-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, newPassword: newPassword })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            window.location.href = "login.html"; // Redirect to login page
        }
    })
    .catch(error => console.error("Error:", error));
}