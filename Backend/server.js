const express = require("express");
const bodyparser = require("body-parser");
const bcrypt = require("bcrypt");
const connection = require("./database");
const path = require("path");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for frontend requests


app.use(express.static(path.join(__dirname, '../Frontend')));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/home-page/index.html'));

});

// -------------Contact Form Submit Code-------------------------
// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// Handle contact form submission
app.post("/send-email", (req, res) => {
    const { name, email, message } = req.body;

    const mailOptions = {
        from: email,  
        to: process.env.EMAIL_USER, 
        subject: `${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: "Failed to send email", error });
        }
        res.json({ message: "Message sent successfully!" });
    });
});

// -------------Contact Form Submit home-page-------------------------

app.post("/hsend-email", (req, res) => {
    const { name, email, subject, message } = req.body;

    const mailOptions = {
        from: email,  
        to: process.env.EMAIL_USER, 
        subject: `${name}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject:${subject}\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: "Failed to send email", error });
        }
        res.json({ message: "Message sent successfully!" });
    });
});

// -------------Contact Form Submit end-------------------------



//-------REACT BACKEND CODE-------------------------------------------------

// Registration for react
app.post("/register", async (req, res) => {
    console.log(req.body);
    const { user_name, email, password } = req.body;
    if (!user_name || !password || !email) {
        return res.status(400).send('Please fill in all fields.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        connection.query(
            'INSERT INTO react_users (user_name, email, password) VALUES (?, ?, ?)',
            [user_name, email, hashedPassword],
            (err, results) => {
                if (err) {
                         if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).send('<script>alert("Email already registered."); window.location.href = "./React_Frontend/html/registration.html";</script>');                           } 
                           
                            return res.status(500).send('<script>alert("Database error."); window.location.href = "./React_Frontend/html/registration.html";</script>');
                        }
                        res.status(200).send('<script>alert("Registration successful! Redirecting to login page..."); window.location.href = "./React_Frontend/html/login.html";</script>');
                    }
                );
            } catch (error) {
                res.status(500).send('<script>alert("Server error."); window.location.href = "./React_Frontend/html/registration.html";</script>');
            }
   });
// Login  for react
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('<script>alert("Please enter email and password.");</script>');
    }

    try {
        connection.query("SELECT * FROM react_users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('<script>alert("DataBase error.");</script>');
            }

            if (results.length === 0) {
                return res.status(400).send('<script>alert("user not found"); window.location.href = "./React_Frontend/html/login.html";</script>');
            }

            const user = results[0];

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).send('<script>alert("invalid credentials"); window.location.href = "./React_Frontend/html/login.html";</script>');
            }
            
            res.send('<script>alert("Login successful!");window.location.href = "./React_Frontend/html/indexx.html";</script>');
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});


//-------REACT FORGOT PASSWORD-------------------------------------------------


let verificationCodes = {}; // Store temporary verification codes 

// 📧 1️⃣ Send Verification Code via Email
app.post("/send-code", async (req, res) => {
    const { email } = req.body;

    connection.query("SELECT * FROM react_users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Email not found!" });
        }

        // Generate a 4-digit verification code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        verificationCodes[email] = code;

        // 🔹 Set up Nodemailer transporter
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user:process.env.EMAIL_USER , // Your email address
                pass: process.env.EMAIL_PASS // Your email password or app password
            }
        });

        // 🔹 Email content
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Code",
            text: `Your verification code is: ${code}`
        };

        // 🔹 Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ success: false, message: "Failed to send email." });
            }
            console.log("Email sent:", info.response);
            res.json({ success: true, message: "Verification code sent to email!" });
        });
    });
});

// ✅ 2️⃣ Verify Code
app.post("/verify-code", (req, res) => {
    const { email, code } = req.body;

    if (verificationCodes[email] === code) {
        res.json({ success: true, message: "Code verified!" });
    } else {
        res.status(400).json({ success: false, message: "Invalid code!" });
    }
});

// 🔐 3️⃣ Reset Password
app.post("/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    if (!verificationCodes[email]) {
        return res.status(400).json({ success: false, message: "Verification required!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    connection.query(
        "UPDATE react_users SET password = ? WHERE email = ?",
        [hashedPassword, email],
        (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            delete verificationCodes[email]; // Remove used code
            res.json({ success: true, message: "Password reset successful!" });
        }
    );
});

//-------AWS BACKEND CODE-------------------------------------------------

// 🟢 USER REGISTRATION for aws
app.post("/aws-register", async (req, res) => {
    console.log(req.body);
    const { user_name, email, password } = req.body;

    if (!user_name || !email || !password) {
        return res.status(400).send('<script>alert("Please fill in all fields."); window.history.back();</script>');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        connection.query(
            'INSERT INTO userinfo (user_name, email, password) VALUES (?, ?, ?)',
            [user_name, email, hashedPassword],
            (err, results) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).send('<script>alert("Email already registered."); window.history.back();</script>');
                    }
                    return res.status(500).send('<script>alert("Database error. Please try again later."); window.history.back();</script>');
                }
                res.status(200).send('<script>alert("Registration successful! Redirecting to login page..."); window.location.href = "./Devops-Frontend/html/login.html";</script>');
            }
        );
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).send('<script>alert("Server error. Please try again."); window.history.back();</script>');
    }
});

// 🟢 USER LOGIN for aws
app.post("/aws-login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('<script>alert("Please enter email and password."); window.history.back();</script>');
    }

    try {
        connection.query("SELECT * FROM userinfo WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error("Database Error:", err.message);
                return res.status(500).send('<script>alert("Database error. Please try again."); window.history.back();</script>');
            }

            if (results.length === 0) {
                return res.status(400).send('<script>alert("User not found.");  window.history.back();</script>');
            }

            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).send('<script>alert("Invalid credentials.");   window.history.back();</script>');
            }

            res.send('<script>alert("Login successful! Redirecting..."); window.location.href = "./Devops-Frontend/html/indexx.html";</script>');
        });
    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).send('<script>alert("Server error. Please try again."); window.history.back();</script>');
    }
});


//-------AWS FORGOT PASSWORD-------------------------------------------------

let verificationCode = {}; // Store temporary verification codes

// 📧 1️⃣ Send Verification Code via Email
app.post("/aws-send-code", async (req, res) => {
    const { email } = req.body;

    connection.query("SELECT * FROM userinfo WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Email not found!" });
        }

        // Generate a 4-digit verification code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        verificationCode[email] = code;

        // 🔹 Set up Nodemailer transporter
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user:process.env.EMAIL_USER , // Your email address
                pass: process.env.EMAIL_PASS // Your email password or app password
            }
        });

        // 🔹 Email content
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Code",
            text: `Your verification code is: ${code}`
        };

        // 🔹 Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ success: false, message: "Failed to send email." });
            }
            console.log("Email sent:", info.response);
            res.json({ success: true, message: "Verification code sent to email!" });
        });
    });
});

// ✅ 2️⃣ Verify Code
app.post("/aws-verify-code", (req, res) => {
    const { email, code } = req.body;

    if (verificationCode[email] === code) {
        res.json({ success: true, message: "Code verified!" });
    } else {
        res.status(400).json({ success: false, message: "Invalid code!" });
    }
});

// 🔐 3️⃣ Reset Password
app.post("/aws-reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    if (!verificationCode[email]) {
        return res.status(400).json({ success: false, message: "Verification required!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    connection.query(
        "UPDATE userinfo SET password = ? WHERE email = ?",
        [hashedPassword, email],
        (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            delete verificationCode[email]; // Remove used code
            res.json({ success: true, message: "Password reset successful!" });
        }
    );
});






//-------python BACKEND CODE-------------------------------------------------

// Registration for python
app.post("/p-register", async (req, res) => {
    console.log(req.body);
    const { user_name, email, password } = req.body;
    if (!user_name || !password || !email) {
        return res.status(400).send('Please fill in all fields.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        connection.query(
            'INSERT INTO python_users (user_name, email, password) VALUES (?, ?, ?)',
            [user_name, email, hashedPassword],
            (err, results) => {
                if (err) {
                         if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).send('<script>alert("Email already registered."); window.location.href = "./python_Frontend/html/registration.html";</script>');                           } 
                           
                            return res.status(500).send('<script>alert("Database error."); window.location.href = "./python_Frontend/html/registration.html";</script>');
                        }
                        res.status(200).send('<script>alert("Registration successful! Redirecting to login page..."); window.location.href = "./python_Frontend/html/login.html";</script>');
                    }
                );
            } catch (error) {
                res.status(500).send('<script>alert("Server error."); window.location.href = "./python_Frontend/html/registration.html";</script>');
            }
   });
// Login  for python
app.post("/p-login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('<script>alert("Please enter email and password.");</script>');
    }

    try {
        connection.query("SELECT * FROM python_users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('<script>alert("DataBase error.");  window.location.href = "./python_Frontend/html/login.html";</script>');
            }

            if (results.length === 0) {
                return res.status(400).send('<script>alert("user not found"); window.location.href = "./python_Frontend/html/login.html";</script>');
            }

            const user = results[0];

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).send('<script>alert("invalid credentials"); window.location.href = "./python_Frontend/html/login.html";</script>');
            }
            
            res.send('<script>alert("Login successful!");window.location.href = "./python_Frontend/html/python.html";</script>');
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});


//-------python FORGOT PASSWORD-------------------------------------------------


let verificationCod = {}; // Store temporary verification codes 

// 📧 1️⃣ Send Verification Code via Email
app.post("/p-send-code", async (req, res) => {
    const { email } = req.body;

    connection.query("SELECT * FROM python_users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Email not found!" });
        }

        // Generate a 4-digit verification code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        verificationCod[email] = code;

        // 🔹 Set up Nodemailer transporter
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user:process.env.EMAIL_USER , // Your email address
                pass: process.env.EMAIL_PASS // Your email password or app password
            }
        });

        // 🔹 Email content
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Code",
            text: `Your verification code is: ${code}`
        };

        // 🔹 Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ success: false, message: "Failed to send email." });
            }
            console.log("Email sent:", info.response);
            res.json({ success: true, message: "Verification code sent to email!" });
        });
    });
});

// ✅ 2️⃣ Verify Code
app.post("/p-verify-code", (req, res) => {
    const { email, code } = req.body;

    if (verificationCod[email] === code) {
        res.json({ success: true, message: "Code verified!" });
    } else {
        res.status(400).json({ success: false, message: "Invalid code!" });
    }
});

// 🔐 3️⃣ Reset Password
app.post("/p-reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    if (!verificationCod[email]) {
        return res.status(400).json({ success: false, message: "Verification required!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    connection.query(
        "UPDATE python_users SET password = ? WHERE email = ?",
        [hashedPassword, email],
        (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            delete verificationCodes[email]; // Remove used code
            res.json({ success: true, message: "Password reset successful!" });
        }
    );
});


//-------AI BACKEND CODE-------------------------------------------------

// Registration for AI
app.post("/ai-register", async (req, res) => {
    console.log(req.body);
    const { user_name, email, password } = req.body;
    if (!user_name || !password || !email) {
        return res.status(400).send('Please fill in all fields.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        connection.query(
            'INSERT INTO ai_users (user_name, email, password) VALUES (?, ?, ?)',
            [user_name, email, hashedPassword],
            (err, results) => {
                if (err) {
                         if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).send('<script>alert("Email already registered."); window.location.href = "./AI-Frontend/html/registration.html";</script>');                           } 
                           
                            return res.status(500).send('<script>alert("Database error."); window.location.href = "./AI-Frontend/html/registration.html";</script>');
                        }
                        res.status(200).send('<script>alert("Registration successful! Redirecting to login page..."); window.location.href = "./AI-Frontend/html/login.html";</script>');
                    }
                );
            } catch (error) {
                res.status(500).send('<script>alert("Server error."); window.location.href = "./AI-Frontend/html/registration.html";</script>');
            }
   });
// Login  for AI
app.post("/ai-login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('<script>alert("Please enter email and password.");</script>');
    }

    try {
        connection.query("SELECT * FROM ai_users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('<script>alert("DataBase error.");  window.location.href = "./AI-Frontend/html/login.html";</script>');
            }

            if (results.length === 0) {
                return res.status(400).send('<script>alert("user not found"); window.location.href = "./AI-Frontend/html/login.html";</script>');
            }

            const user = results[0];

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).send('<script>alert("invalid credentials"); window.location.href = "./AI-Frontend/html/login.html";</script>');
            }
            
            res.send('<script>alert("Login successful!");window.location.href = "./AI-Frontend/html/index.html";</script>');
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});


//-------AI FORGOT PASSWORD-------------------------------------------------


let verificationCo = {}; // Store temporary verification codes 

// 📧 1️⃣ Send Verification Code via Email
app.post("/ai-send-code", async (req, res) => {
    const { email } = req.body;

    connection.query("SELECT * FROM ai_users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Email not found!" });
        }

        // Generate a 4-digit verification code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        verificationCo[email] = code;

        // 🔹 Set up Nodemailer transporter
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user:process.env.EMAIL_USER , // Your email address
                pass: process.env.EMAIL_PASS // Your email password or app password
            }
        });

        // 🔹 Email content
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Code",
            text: `Your verification code is: ${code}`
        };

        // 🔹 Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ success: false, message: "Failed to send email." });
            }
            console.log("Email sent:", info.response);
            res.json({ success: true, message: "Verification code sent to email!" });
        });
    });
});

// ✅ 2️⃣ Verify Code
app.post("/ai-verify-code", (req, res) => {
    const { email, code } = req.body;

    if (verificationCo[email] === code) {
        res.json({ success: true, message: "Code verified!" });
    } else {
        res.status(400).json({ success: false, message: "Invalid code!" });
    }
});

// 🔐 3️⃣ Reset Password
app.post("/ai-reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    if (!verificationCo[email]) {
        return res.status(400).json({ success: false, message: "Verification required!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    connection.query(
        "UPDATE ai_users SET password = ? WHERE email = ?",
        [hashedPassword, email],
        (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            delete verificationCodes[email]; // Remove used code
            res.json({ success: true, message: "Password reset successful!" });
        }
    );
});

const port = 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
