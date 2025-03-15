const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database("database.db", (err) => {
    if (err) console.error(err.message);
    console.log("Connected to SQLite database.");
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY, user_id INTEGER, start_time TEXT, end_time TEXT, FOREIGN KEY(user_id) REFERENCES users(id))");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({ secret: "secret-key", resave: false, saveUninitialized: true }));

const auth = (req, res, next) => {
    if (!req.session.userId) return res.redirect("/login");
    next();
};

app.get("/", (req, res) => {
    db.get("SELECT * FROM reservations WHERE start_time <= datetime('now') AND end_time >= datetime('now')", (err, reservation) => {
        res.send(`
            <html>
            <head>
                <link rel="stylesheet" type="text/css" href="/style.css">
            </head>
            <body>
                <h1>Remote Access Status</h1>
                <p>${reservation ? "🔴 Currently In Use" : "🟢 Currently Available"}</p>
                <a href='/reserve'>Book a Slot</a>
            </body>
            </html>
        `);
    });
});

app.get("/login", (req, res) => {
    res.send(`
        <html>
        <head>
            <link rel="stylesheet" type="text/css" href="/style.css">
        </head>
        <body>
            <h2>Login</h2>
            <form method="POST" action="/login">
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
        </body>
        </html>
    `);
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            return res.redirect("/reserve");
        }
        res.send("Invalid credentials");
    });
});

app.get("/reserve", auth, (req, res) => {
    res.send(`
        <html>
        <head>
            <link rel="stylesheet" type="text/css" href="/style.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
        </head>
        <body>
            <div class="container">
                <h2>Book a Slot</h2>
                <div class="form-box">
                    <form method="POST" action="/reserve">
                        <label for="start_time">Select Start Time:</label>
                        <input type="text" id="start_time" name="start_time" required>

                        <label for="duration">Duration (in minutes):</label>
                        <input type="number" id="duration" name="duration" min="1" max="240" value="60" required> 

                        <button type="submit">Reserve Now</button>
                    </form>
                </div>

                <h2>Quick Reservation</h2>
                <div class="form-box">
                    <form method="POST" action="/quick-reserve">
                        <label for="quick_duration">Duration (in minutes):</label>
                        <select id="quick_duration" name="quick_duration">
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="120">2 hours</option>
                            <option value="180">3 hours</option>
                            <option value="240">4 hours</option>
                        </select>

                        <button type="submit">Book Now</button>
                    </form>
                </div>

                <a href="/" class="back-button">Back to Homepage</a>
            </div>

            <!-- Flatpickr Library -->
            <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
            <script>
                flatpickr("#start_time", {
                    enableTime: true,
                    dateFormat: "Y-m-d H:i:S",
                    defaultDate: new Date(),
                });
            </script>
        </body>
        </html>
    `);
});

app.post("/reserve", auth, (req, res) => {
    const startTime = new Date(req.body.start_time);
    const durationMinutes = parseInt(req.body.duration, 10) || 60; // Default = 60 minutes
    // const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const localStartTime = new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000);
    const endTime = new Date(localStartTime.getTime() + durationMinutes * 60 * 1000);

    const formattedStartTime = localStartTime.toISOString().slice(0, 19).replace("T", " ");
    const formattedEndTime = endTime.toISOString().slice(0, 19).replace("T", " ");

    db.get(
        "SELECT * FROM reservations WHERE NOT (end_time <= ? OR start_time >= ?)",
        [formattedStartTime, formattedEndTime],
        (err, existing) => {
            if (existing) {
                console.log("Slot already booked, searching for next available slot...");

                // Find the next available slot after the conflicting reservation
                db.get(
                    "SELECT end_time FROM reservations WHERE end_time > ? ORDER BY end_time ASC LIMIT 1",
                    [formattedEndTime],
                    (err, nextAvailable) => {
                        let suggestedStart = new Date(endTime);

                        if (nextAvailable) {
                            suggestedStart = new Date(nextAvailable.end_time);
                        }

                        let suggestedEnd = new Date(suggestedStart.getTime() + durationMinutes * 60 * 1000);

                        const suggestedStartTime = suggestedStart.toISOString().slice(0, 19).replace("T", " ");
                        const suggestedEndTime = suggestedEnd.toISOString().slice(0, 19).replace("T", " ");

                        return res.send(`
                            <h2>Time slot already booked!</h2>
                            <p>Please choose a different time.</p>
                            <h3>🔎 Suggested Next Available Slot:</h3>
                            <p>${suggestedStartTime} to ${suggestedEndTime}</p>
                            <button onclick="window.location.href='/reserve'">🔙 Try Again</button>
                        `);
                    }
                );
            } else {
                db.run(
                    "INSERT INTO reservations (user_id, start_time, end_time) VALUES (?, ?, ?)",
                    [req.session.userId, formattedStartTime, formattedEndTime],
                    function () {
                        console.log("✅ Reservation Confirmed:", formattedStartTime, "to", formattedEndTime);
                
                        res.send(`
                            <html>
                            <head>
                                <link rel="stylesheet" type="text/css" href="/style.css">
                            </head>
                            <body>
                                <h2>Booking Successful!</h2>
                                <p>Your reservation is confirmed:</p>
                                <p><strong>Start:</strong> ${formattedStartTime}</p>
                                <p><strong>End:</strong> ${formattedEndTime}</p>
                                <a href="/">Back to Homepage</a>
                            </body>
                            </html>
                        `);
                    }
                );
            }
        }
    );
});
app.get("/quick-reserve", auth, (req, res) => {
    db.get(
        "SELECT * FROM reservations WHERE start_time <= datetime('now') AND end_time >= datetime('now')",
        (err, activeReservation) => {
            let pageContent = `
                <html>
                <head>
                    <link rel="stylesheet" type="text/css" href="/style.css">
                    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
                </head>
                <body>
                    <div class="quick-container">
                        <h1><i class="fas fa-clock"></i> Quick Reservation</h1>`;

            if (activeReservation) {
                pageContent += `
                    <p><i class="fas fa-times-circle"></i> The system is currently in use!</p>
                    <p>Please check back later or try booking for a later time.</p>
                    <a href="/" class="back-button"><i class="fas fa-home"></i> Back to Homepage</a>
                `;
            } else {
                pageContent += `
                    <p>Need a quick booking? Select a duration and book instantly!</p>
                    <form method="POST" action="/quick-reserve">
                        <label for="quick_duration"><i class="fas fa-hourglass-half"></i> Choose Duration:</label>
                        <select id="quick_duration" name="quick_duration">
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="120">2 hours</option>
                            <option value="180">3 hours</option>
                            <option value="240">4 hours</option>
                        </select>
                        <button type="submit"><i class="fas fa-check-circle"></i> Book Instantly</button>
                    </form>
                    <a href="/" class="back-button"><i class="fas fa-home"></i> Back to Homepage</a>
                `;
            }

            pageContent += `</div></body></html>`;
            res.send(pageContent);
        }
    );
});





app.post("/quick-reserve", auth, (req, res) => {
    const startTime = new Date();
    const durationMinutes = parseInt(req.body.quick_duration, 10) || 60; // Default to 1 hour if not set
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const formattedStartTime = startTime.toISOString().slice(0, 19).replace("T", " ");
    const formattedEndTime = endTime.toISOString().slice(0, 19).replace("T", " ");

    db.get(
        "SELECT * FROM reservations WHERE NOT (end_time <= ? OR start_time >= ?)",
        [formattedStartTime, formattedEndTime],
        (err, existing) => {
            if (existing) {
                console.log("Quick Booking Conflict! Looking for next available slot...");

                db.get(
                    "SELECT end_time FROM reservations WHERE end_time > ? ORDER BY end_time ASC LIMIT 1",
                    [formattedEndTime],
                    (err, nextAvailable) => {
                        let suggestedStart = new Date(endTime);

                        if (nextAvailable) {
                            suggestedStart = new Date(nextAvailable.end_time);
                        }

                        let suggestedEnd = new Date(suggestedStart.getTime() + durationMinutes * 60 * 1000);

                        const suggestedStartTime = suggestedStart.toISOString().slice(0, 19).replace("T", " ");
                        const suggestedEndTime = suggestedEnd.toISOString().slice(0, 19).replace("T", " ");

                        return res.send(`
                            <html>
                            <head>
                                <link rel="stylesheet" type="text/css" href="/style.css">
                            </head>
                            <body>
                                <div class="error-container">
                                    <h1>Quick Booking Failed - Time Slot Taken</h1>
                                    <p>Your selected time is already booked.</p>
                        
                                    <h3>Suggested Next Available Slot:</h3>
                                    <p class="suggested-slot">${suggestedStartTime} to ${suggestedEndTime}</p>
                        
                                    <button onclick="window.location.href='/quick-reserve'">Try Again</button>
                                </div>
                            </body>
                            </html>
                        `);
                    }
                );
            } else {
                db.run(
                    "INSERT INTO reservations (user_id, start_time, end_time) VALUES (?, ?, ?)",
                    [req.session.userId, formattedStartTime, formattedEndTime],
                    function () {
                        console.log(`Quick Reservation confirmed: User ${req.session.userId} from ${formattedStartTime} to ${formattedEndTime}`);

                        res.send(`
                            <h2>Quick Booking Successful!</h2>
                            <p>Your reservation is confirmed from ${formattedStartTime} to ${formattedEndTime}.</p>
                            <button onclick="window.location.href='/'">Go to Homepage</button>
                        `);
                    }
                );
            }
        }
    );
});


// app.post("/reserve", auth, (req, res) => {
//     const startTime = new Date(req.body.start_time);
//     const durationMinutes = parseInt(req.body.duration, 10) || 60; // Default = 60 minutes
//     const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

//     const formattedStartTime = startTime.toISOString().replace("T", " ").slice(0, 19);
//     const formattedEndTime = endTime.toISOString().replace("T", " ").slice(0, 19);

//     db.get(
//         "SELECT * FROM reservations WHERE start_time < ? AND end_time >= ?",
//         [formattedEndTime, formattedStartTime],
//         (err, existing) => {
//             console.log("Checking conflicts...");
//             console.log("Requested Start:", formattedStartTime);
//             console.log("Requested End:", formattedEndTime);
//             if (existing) {
//                 console.log("Conflict found; existing reservation:");
//                 console.log(existing);
//                 return res.send("Time slot already booked! Please choose a different time.");
//             }
//             console.log("No conflicts. Proceeding with booking...");
//             db.run(
//                 "INSERT INTO reservations (user_id, start_time, end_time) VALUES (?, ?, ?)",
//                 [req.session.userId, formattedStartTime, formattedEndTime],
//                 () => {
//                     console.log("Reservation confirmed:", formattedStartTime, "to", formattedEndTime);
//                     res.redirect("/");
//                 }
//             );
//         }
//     );
// });


// app.post("/reserve", auth, (req, res) => {
//     const startTime = req.body.start_time;
//     const endTime = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
//     db.get("SELECT * FROM reservations WHERE start_time <= ? AND end_time >= ?", [endTime, startTime], (err, existing) => {
//         if (existing) return res.send("Time slot already booked");
//         db.run("INSERT INTO reservations (user_id, start_time, end_time) VALUES (?, ?, ?)", [req.session.userId, startTime, endTime], () => {
//             res.redirect("/");
//         });
//     });
// });

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    db.all("SELECT * FROM reservations", (err, rows) => {
        if (err) {
            console.error("Error fetching reservations:", err.message);
        } else {
            console.log("Current Reservations:");
            if (rows.length === 0) {
                console.log("No reservations found.");
            } else {
                rows.forEach((reservation) => {
                    console.log(
                        `ID: ${reservation.id}, User: ${reservation.user_id}, Start: ${reservation.start_time}, End: ${reservation.end_time}`
                    );
                });
            }
        }
    });
});


// TODO:
// invalid credentials page
// 404 page
// put in other accounts


// FIXME: 
// center the divs

