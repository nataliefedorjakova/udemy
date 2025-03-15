const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("database.db", (err) => {
    if (err) {
        console.error("❌ Error opening database:", err.message);
    } else {
        console.log("✅ Connected to SQLite database.");
    }
});

const users = [
    { username: "admin", password: "admin123" },
    { username: "user1", password: "securepass" },
    { username: "user2", password: "mypassword" }
];

const saltRounds = 10;

users.forEach(user => {
    bcrypt.hash(user.password, saltRounds, (err, hash) => {
        if (err) {
            console.error("❌ Error hashing password:", err);
        } else {
            db.run(
                "INSERT INTO users (username, password) VALUES (?, ?)",
                [user.username, hash],
                function (err) {
                    if (err) {
                        console.error(`❌ Error inserting user ${user.username}:`, err.message);
                    } else {
                        console.log(`✅ User '${user.username}' added successfully!`);
                    }
                }
            );
        }
    });
});
