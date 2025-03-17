const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser"); 
const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database("database.db", (err) => {
    if (err) console.error(err.message);
    console.log("Connected to SQLite database.");
});

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY, user_name TEXT, start_time TEXT, end_time TEXT)");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (req, res) => {
    if (!req.cookies.username) {
        return res.redirect("/welcome");
    }
    res.redirect("/home");
});

app.get("/welcome", (req, res) => {
    res.send(`
        <html>
        <head>
            <link rel="stylesheet" type="text/css" href="/style.css">
        </head>
        <body>
            <div class="container">
                <h2>Welcome! Your name:</h2>
                <form method="POST" action="/set-name">
                    <input type="text" name="username" placeholder="Enter your name" required>
                    <button type="submit">Continue</button>
                </form>
                <footer class="footer">
                    <p>💙 Sharing is caring 💙</p>
                </footer>
            </div>
        </body>
        </html>
    `);
});

app.post("/set-name", (req, res) => {
    const username = req.body.username.trim();
    if (!username) {
        return res.redirect("/welcome");
    }
    res.cookie("username", username, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.redirect("/home");
});

app.get("/home", (req, res) => {
    const username = req.cookies.username || "Guest";
    db.get("SELECT user_name FROM reservations WHERE start_time <= datetime('now') AND end_time >= datetime('now')", (err, reservation) => {
        res.send(`
            <html>
            <head>
                <link rel="stylesheet" type="text/css" href="/style.css">
            </head>
            <body>
                <h1>Welcome, ${username}!</h1>
                <h2>Remote Access Status</h2>
                <p>${reservation ? `🔴 Currently in Use by ${reservation.user_name}` : "🟢 Currently Available"}</p>
                <a href='/reserve'>Book a Slot</a> | 
                <a href="/logout">Change Name</a>
            </body>
            </html>
        `);
    });
});

app.get("/reserve", (req, res) => {
    const username = req.cookies.username || "Guest";
    res.send(`
        <html>
        <head>
            <link rel="stylesheet" type="text/css" href="/style.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
        </head>
        <body>
            <div class="container">
                <h2>Hello, ${username}! Ready to book?</h2>

                <!-- Quick Reservation First -->
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

                <!-- Normal Booking Below -->
                <h2>Book a Custom Slot</h2>
                <div class="form-box">
                    <form method="POST" action="/reserve">
                        <input type="hidden" name="username" value="${username}">
                        <label for="start_time">Select Start Time:</label>
                        <input type="text" id="start_time" name="start_time" required>

                        <label for="duration">Duration (in minutes):</label>
                        <input type="number" id="duration" name="duration" min="1" max="240" value="60" required> 

                        <button type="submit">Reserve Now</button>
                    </form>
                </div>

                <a href="/home">Back to Home</a>

                <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
                <script>
                    flatpickr("#start_time", {
                        enableTime: true,
                        dateFormat: "Y-m-d H:i:S",
                        defaultDate: new Date(),
                    });
                </script>
            </div>
        </body>
        </html>
    `);
});

// app.post("/quick-reserve", (req, res) => {
//     console.log("🔵 Received Quick Reservation Request:", req.body);

//     const username = req.cookies.username || "Guest";
//     const startTime = new Date(); // Quick reservations always start *now*
//     const durationMinutes = parseInt(req.body.quick_duration, 10) || 30;
//     const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

//     const formattedStartTime = startTime.toISOString().slice(0, 19).replace("T", " ");
//     const formattedEndTime = endTime.toISOString().slice(0, 19).replace("T", " ");

//     console.log(`Trying to book from ${formattedStartTime} (UTC) to ${formattedEndTime} (UTC)`);

//     db.all(
//         "SELECT start_time, end_time FROM reservations ORDER BY start_time ASC",
//         (err, reservations) => {
//             if (err) {
//                 console.error("Database error:", err.message);
//                 return res.status(500).send("Internal Server Error");
//             }

//             console.log("Existing Reservations in Database:");
//             if (reservations.length === 0) {
//                 console.log("No existing reservations. Proceeding with quick booking.");
//             } else {
//                 reservations.forEach((r, i) => {
//                     console.log(`${i + 1}. Start: ${r.start_time} (DB Time), End: ${r.end_time} (DB Time)`);
//                 });
//             }

//             let hasConflict = false;

//             console.log(" Checking for conflicts...");
//             for (let i = 0; i < reservations.length; i++) {
//                 let currentStart = new Date(reservations[i].start_time + "Z");
//                 let currentEnd = new Date(reservations[i].end_time + "Z");

//                 console.log(`   Comparing against Reservation ${i + 1}:`);
//                 console.log(`   Start: ${currentStart.toISOString()} (UTC)`);
//                 console.log(`   End: ${currentEnd.toISOString()} (UTC)`);

//                 if (startTime.getTime() < currentEnd.getTime() && endTime.getTime() > currentStart.getTime()) {
//                     console.log(`   Overlap detected with Reservation ${i + 1}!`);
//                     hasConflict = true;
//                     break;
//                 }
//             }

//             if (hasConflict) {
//                 let latestEndTime = new Date(reservations[reservations.length - 1].end_time);
//                 let nextAvailableSlot = new Date(latestEndTime.getTime() + 1 * 60 * 1000);
//                 let formattedNextSlot = nextAvailableSlot.toLocaleString("en-US", { timeZone: "Europe/Prague" });

//                 console.log(`    Final next available slot (Local Time): ${formattedNextSlot}`);

//                 return res.send(`
//                     <html>
//                     <head>
//                         <link rel="stylesheet" type="text/css" href="/style.css">
//                     </head>
//                     <body>
//                         <div class="error-container">
//                             <h1>Quick Booking Failed - Time Slot Taken!</h1>
//                             <p>Sorry, this time is already taken.</p>
//                             <p>The next available slot is:</p>
//                             <p class="suggested-slot"><strong>${formattedNextSlot}</strong></p>
//                             <a href="/quick-reserve" class="back-button">Try Again</a>
//                         </div>
//                     </body>
//                     </html>
//                 `);
//             }

//             // No conflicts → Proceed with quick reservation
//             console.log(`No conflicts. Proceeding with quick booking.`);

//             db.run(
//                 "INSERT INTO reservations (user_name, start_time, end_time) VALUES (?, ?, ?)",
//                 [username, formattedStartTime, formattedEndTime],
//                 function () {
//                     console.log(`Quick Reservation confirmed: ${username}, ${formattedStartTime} to ${formattedEndTime}`);

//                     res.send(`
//                         <html>
//                         <head>
//                             <link rel="stylesheet" type="text/css" href="/style.css">
//                         </head>
//                         <body>
//                             <div class="confirmation-container">
//                                 <h1>Quick Booking Successful!</h1>
//                                 <p>Your quick reservation is confirmed:</p>
//                                 <p><strong>Start:</strong> ${formattedStartTime}</p>
//                                 <p><strong>End:</strong> ${formattedEndTime}</p>
//                                 <a href="/home" class="back-button">Back to Homepage</a>
//                             </div>
//                         </body>
//                         </html>
//                     `);
//                 }
//             );
//         }
//     );
// });


// app.post("/quick-reserve", (req, res) => {
//     console.log("Received Quick Reservation Request:", req.body);

//     const username = req.cookies.username || "Guest";
//     const startTime = new Date(req.body.start_time);
//     const durationMinutes = parseInt(req.body.quick_duration, 10) || 30;
//     const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

//     const formattedStartTime = startTime.toISOString();
//     const formattedEndTime = endTime.toISOString();

//     console.log(`Trying to book from ${formattedStartTime} (UTC) to ${formattedEndTime} (UTC)`);

//     db.all(
//         "SELECT start_time, end_time FROM reservations WHERE end_time > datetime('now') ORDER BY start_time ASC",
//         (err, reservations) => {
//             if (err) {
//                 console.error("Database error:", err.message);
//                 return res.status(500).send("Internal Server Error");
//             }

//             console.log("Existing Reservations:");
//             reservations.forEach((r, i) => {
//                 console.log(`${i + 1}. Start: ${r.start_time} (DB Time), End: ${r.end_time} (DB Time)`);
//             });

//             let nextAvailableSlot = new Date(); 
//             let latestEndTime = new Date(0); 

//             for (let i = 0; i < reservations.length; i++) {
//                 let currentStart = new Date(Date.parse(reservations[i].start_time + "Z")); 
//                 let currentEnd = new Date(Date.parse(reservations[i].end_time + "Z")); 

//                 console.log(`Checking reservation ${i + 1}: Start ${currentStart.toISOString()} (UTC), End ${currentEnd.toISOString()} (UTC)`);

//                 if (nextAvailableSlot < currentStart) {
//                     console.log(`Next available slot: ${nextAvailableSlot.toISOString()} (UTC)`);
//                     break;
//                 }

//                 if (currentEnd > latestEndTime) {
//                     latestEndTime = currentEnd;
//                     console.log(`Updating latest end time to: ${latestEndTime.toISOString()} (UTC)`);
//                 }

//                 nextAvailableSlot = new Date(latestEndTime.getTime() + 1 * 60 * 1000);
//                 console.log(`Moving next available slot to: ${nextAvailableSlot.toISOString()} (UTC)`);
//             }

//             // Convert to local time for display
//             let localNextSlot = new Date(nextAvailableSlot);
//             let formattedNextSlot = localNextSlot.toLocaleString("en-US", { timeZone: "Europe/Prague" });

//             console.log(`Final next available slot (Local Time): ${formattedNextSlot}`);

//             return res.send(`
//                 <html>
//                 <head>
//                     <link rel="stylesheet" type="text/css" href="/style.css">
//                 </head>
//                 <body>
//                     <div class="error-container">
//                         <h1>Quick Booking Failed - Time Slot Taken</h1>
//                         <p>The next available slot is:</p>
//                         <p class="suggested-slot"><strong>${formattedNextSlot}</strong></p>
//                         <a href="/quick-reserve" class="back-button">Try Again</a>
//                     </div>
//                 </body>
//                 </html>
//             `);
//         }
//     );
// });

app.get("/quick-reserve", (req, res) => {
    const username = req.cookies.username || "Guest";
    db.get(
        "SELECT user_name FROM reservations WHERE start_time <= datetime('now') AND end_time >= datetime('now')",
        (err, activeReservation) => {
            let pageContent = `
                <html>
                <head>
                    <link rel="stylesheet" type="text/css" href="/style.css">
                </head>
                <body>
                    <div class="container">
                        <h1>Quick Reservation</h1>`;

            if (activeReservation) {
                pageContent += `
                    <div class="error-container">
                        <p>The system is currently in use by <strong>${activeReservation.user_name}</strong>.</p>
                        <p>Please try booking for a later time.</p>
                        <a href="/home" class="back-button">Back to Homepage</a>
                    </div>
                `;
            } else {
                pageContent += `
                    <p>Need a quick booking? Select a duration and book instantly!</p>
                    <div class="form-box">
                        <form method="POST" action="/quick-reserve">
                            <input type="hidden" name="username" value="${username}">
                            <label for="quick_duration">Choose Duration:</label>
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
                    <a href="/home" class="back-button">Back to Homepage</a>
                `;
            }

            pageContent += `</div></body></html>`;
            res.send(pageContent);
        }
    );
});

app.post("/quick-reserve", (req, res) => {
    console.log("🔵 Received Quick Reservation Request:", req.body);

    const username = req.cookies.username || "Guest";
    const startTime = new Date(); // Quick reservations always start *now*
    const durationMinutes = parseInt(req.body.quick_duration, 10) || 30;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const formattedStartTime = startTime.toISOString().slice(0, 19).replace("T", " ");
    const formattedEndTime = endTime.toISOString().slice(0, 19).replace("T", " ");

    console.log(`Trying to book from ${formattedStartTime} (UTC) to ${formattedEndTime} (UTC)`);

    db.all(
        "SELECT start_time, end_time FROM reservations ORDER BY start_time ASC",
        (err, reservations) => {
            if (err) {
                console.error("Database error:", err.message);
                return res.status(500).send("Internal Server Error");
            }

            console.log("Existing Reservations in Database:");
            if (reservations.length === 0) {
                console.log("No existing reservations. Proceeding with quick booking.");
            } else {
                reservations.forEach((r, i) => {
                    console.log(`${i + 1}. Start: ${r.start_time} (DB Time), End: ${r.end_time} (DB Time)`);
                });
            }

            let hasConflict = false;

            console.log(" Checking for conflicts...");
            for (let i = 0; i < reservations.length; i++) {
                let currentStart = new Date(reservations[i].start_time + "Z");
                let currentEnd = new Date(reservations[i].end_time + "Z");

                console.log(`   Comparing against Reservation ${i + 1}:`);
                console.log(`   Start: ${currentStart.toISOString()} (UTC)`);
                console.log(`   End: ${currentEnd.toISOString()} (UTC)`);

                if (startTime.getTime() < currentEnd.getTime() && endTime.getTime() > currentStart.getTime()) {
                    console.log(`   Overlap detected with Reservation ${i + 1}!`);
                    hasConflict = true;
                    break;
                }
            }

            if (hasConflict) {
                let latestEndTime = new Date(reservations[reservations.length - 1].end_time);
                let nextAvailableSlot = new Date(latestEndTime.getTime() + 1 * 60 * 1000);
                let formattedNextSlot = nextAvailableSlot.toLocaleString("en-US", { timeZone: "Europe/Prague" });

                console.log(`    Final next available slot (Local Time): ${formattedNextSlot}`);
                
                return res.send(`
                    <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="/style.css">
                    </head>
                    <body>
                        <div class="error-container">
                            <h1>Quick Booking Failed - Time Slot Taken!</h1>
                            <p>Sorry, this time is already taken.</p>
                            <p>The next available slot is:</p>
                            <p class="suggested-slot"><strong>${formattedNextSlot}</strong></p>
                            <a href="/quick-reserve" class="back-button">Try Again</a>
                        </div>
                    </body>
                    </html>
                `);
            }

            console.log(`No conflicts. Proceeding with quick booking.`);

            db.run(
                "INSERT INTO reservations (user_name, start_time, end_time) VALUES (?, ?, ?)",
                [username, formattedStartTime, formattedEndTime],
                function () {
                    console.log(`Quick Reservation confirmed: ${username}, ${formattedStartTime} to ${formattedEndTime}`);

                    res.send(`
                        <html>
                        <head>
                            <link rel="stylesheet" type="text/css" href="/style.css">
                        </head>
                        <body>
                            <div class="confirmation-container">
                                <h1>Quick Booking Successful!</h1>
                                <p>Your quick reservation is confirmed:</p>
                                <p><strong>Start:</strong> ${formattedStartTime}</p>
                                <p><strong>End:</strong> ${formattedEndTime}</p>
                                <a href="/home" class="back-button">Back to Homepage</a>
                            </div>
                        </body>
                        </html>
                    `);
                }
            );
        }
    );
});



app.post("/reserve", (req, res) => {
    console.log("🔵 Received Reservation Request:", req.body);

    const username = req.cookies.username || "Guest";

    if (!req.body.start_time) {
        console.error("Error: Invalid start time provided.");
        return res.status(400).send("Invalid start time provided.");
    }

    const startTime = new Date(req.body.start_time);
    if (isNaN(startTime.getTime())) {
        console.error("Error: Invalid start time format.");
        return res.status(400).send("Invalid start time format.");
    }

    const durationMinutes = parseInt(req.body.duration, 10) || 60;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const formattedStartTime = startTime.toISOString().slice(0, 19).replace("T", " ");
    const formattedEndTime = endTime.toISOString().slice(0, 19).replace("T", " ");

    console.log(`Trying to book from ${formattedStartTime} (UTC) to ${formattedEndTime} (UTC)`);

    db.all(
        "SELECT start_time, end_time FROM reservations ORDER BY start_time ASC",
        (err, reservations) => {
            if (err) {
                console.error("Database error:", err.message);
                return res.status(500).send("Internal Server Error");
            }

            console.log("Existing Reservations in Database:");
            if (reservations.length === 0) {
                console.log("No existing reservations. Proceeding with booking.");
            } else {
                reservations.forEach((r, i) => {
                    console.log(`${i + 1}. Start: ${r.start_time} (DB Time), End: ${r.end_time} (DB Time)`);
                });
            }

            let hasConflict = false;

            console.log(" Checking for conflicts...");
            for (let i = 0; i < reservations.length; i++) {
                let currentStart = new Date(reservations[i].start_time + "Z"); // Ensure UTC parsing
                let currentEnd = new Date(reservations[i].end_time + "Z");
            
                console.log(`   Comparing against Reservation ${i + 1}:`);
                console.log(`   Start: ${currentStart.toISOString()} (UTC)`);
                console.log(`   End: ${currentEnd.toISOString()} (UTC)`);
            
                // **Updated Overlap Check**
                if (startTime.getTime() < currentEnd.getTime() && endTime.getTime() > currentStart.getTime()) {
                    console.log(`   Overlap detected with Reservation ${i + 1}!`);
                    hasConflict = true;
                    break;
                }
            }

            if (hasConflict) {
                let latestEndTime = new Date(reservations[reservations.length - 1].end_time);
                let nextAvailableSlot = new Date(latestEndTime.getTime() + 1 * 60 * 1000);
                let formattedNextSlot = nextAvailableSlot.toLocaleString("en-US", { timeZone: "Europe/Prague" });

                console.log(`    Final next available slot (Local Time): ${formattedNextSlot}`);

                return res.send(`
                    <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="/style.css">
                    </head>
                    <body>
                        <div class="error-container">
                            <h1>Time Slot Already Booked!</h1>
                            <p>Sorry, this time is already taken.</p>
                            <p>The next available slot is:</p>
                            <p class="suggested-slot"><strong>${formattedNextSlot}</strong></p>
                            <a href="/reserve" class="back-button">Try Again</a>
                        </div>
                    </body>
                    </html>
                `);
            }

            console.log(`No conflicts. Proceeding with booking.`);

            db.run(
                "INSERT INTO reservations (user_name, start_time, end_time) VALUES (?, ?, ?)",
                [username, formattedStartTime, formattedEndTime],
                function () {
                    console.log(`Reservation confirmed: ${username}, ${formattedStartTime} to ${formattedEndTime}`);

                    res.send(`
                        <html>
                        <head>
                            <link rel="stylesheet" type="text/css" href="/style.css">
                        </head>
                        <body>
                            <div class="confirmation-container">
                                <h1>Booking Successful!</h1>
                                <p>Your reservation is confirmed:</p>
                                <p><strong>Start:</strong> ${formattedStartTime}</p>
                                <p><strong>End:</strong> ${formattedEndTime}</p>
                                <a href="/home" class="back-button">Back to Homepage</a>
                            </div>
                        </body>
                        </html>
                    `);
                }
            );
        }
    );
});




app.get("/logout", (req, res) => {
    res.clearCookie("username");
    res.redirect("/welcome");
});

app.use((req, res) => {
    res.status(404).send(`
        <html>
        <head>
            <link rel="stylesheet" type="text/css" href="/style.css">
        </head>
        <body>
            <div class="error-container">
                <h1>404 - Page Not Found</h1>
                <p>Oops! The page you are looking for does not exist.</p>
                <a href="/home" class="back-button">Return to Homepage</a>
            </div>
        </body>
        </html>
    `);
});

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

