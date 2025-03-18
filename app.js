const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser"); 
const app = express();
const PORT = process.env.PORT || "8080";
const { DateTime } = require("luxon");


const db = new sqlite3.Database("database.db", (err) => {
    if (err) console.error(err.message);
    console.log("Connected to SQLite database.");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY,
        user_name TEXT,
        start_time TEXT DEFAULT (DATETIME('now', 'utc')),
        end_time TEXT
    )`);
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
    let nowLocal = DateTime.local().setZone("Europe/Prague").toFormat("yyyy-MM-dd HH:mm:ss");
    db.get(
      "SELECT user_name FROM reservations WHERE start_time <= ? AND end_time >= ?",
      [nowLocal, nowLocal],
      (err, reservation) => {
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
      }
    );
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
    console.log("Received Quick Reservation Request:", req.body);
    
    const username = req.cookies.username || "Guest";
    
    let localDT = DateTime.local().setZone("Europe/Prague");
    console.log("🕒 Local DateTime for Quick Reserve:", localDT.toString());
    const durationMinutes = parseInt(req.body.quick_duration, 10) || 30;
    
    let endDT = localDT.plus({ minutes: durationMinutes });
    console.log("Quick Reservation End Time (Local):", endDT.toString());
    
    const formattedStartTime = localDT.toFormat("yyyy-MM-dd HH:mm:ss");
    const formattedEndTime = endDT.toFormat("yyyy-MM-dd HH:mm:ss");
    console.log("📌 Formatted Start Time for DB:", formattedStartTime);
    console.log("📌 Formatted End Time for DB:", formattedEndTime);
    
    console.log(`✅ Trying to book from ${formattedStartTime} to ${formattedEndTime} (Local Time)`);
    
    // Retrieve all reservations from the DB
    db.all("SELECT start_time, end_time FROM reservations ORDER BY start_time ASC", (err, reservations) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).send("Internal Server Error");
      }
    
      console.log("📜 Existing Reservations in Database:");
      reservations.forEach((r, i) => {
        console.log(`${i + 1}. Start: ${r.start_time}, End: ${r.end_time}`);
      });
    
      let reservationsLocal = reservations.map(r => ({
        start: DateTime.fromFormat(r.start_time, "yyyy-MM-dd HH:mm:ss", { zone: "Europe/Prague" }),
        end: DateTime.fromFormat(r.end_time, "yyyy-MM-dd HH:mm:ss", { zone: "Europe/Prague" })
      }));
    
      let hasConflict = false;
      console.log("Checking for conflicts...");
      for (let i = 0; i < reservationsLocal.length; i++) {
        console.log(`   🔍 Comparing against Reservation ${i + 1}:`);
        console.log(`   🔹 Start: ${reservationsLocal[i].start.toISO()} (Local)`);
        console.log(`   🔹 End: ${reservationsLocal[i].end.toISO()} (Local)`);
        if (localDT < reservationsLocal[i].end && endDT > reservationsLocal[i].start) {
          console.log(`Overlap detected with Reservation ${i + 1}!`);
          hasConflict = true;
          break;
        }
      }
    
      if (hasConflict) {
        let latestEnd = reservationsLocal.reduce((max, r) => r.end > max ? r.end : max, localDT);
        let nextAvailable = latestEnd.plus({ seconds: 1 });
        let formattedNextSlot = nextAvailable.toFormat("dd/MM/yyyy, HH:mm:ss");
        console.log(`🚦 Final next available slot (Local): ${formattedNextSlot}`);
    
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
    
      console.log("No conflicts. Proceeding with quick booking.");
    
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
    });
  });
  

app.post("/reserve", (req, res) => {
    const username = req.cookies.username || "Guest";
    if (!req.body.start_time) {
      return res.status(400).send("Invalid start time provided.");
    }
  
    let localDT = DateTime.fromFormat(req.body.start_time, "yyyy-MM-dd HH:mm:ss", { zone: "Europe/Prague" });
    if (!localDT.isValid) {
      return res.status(400).send("Invalid start time format.");
    }
    console.log("Local DateTime (from frontend):", localDT.toString());
  
    const durationMinutes = parseInt(req.body.duration, 10) || 60;
    let endDT = localDT.plus({ minutes: durationMinutes });
    console.log("Local End DateTime:", endDT.toString());
  
    const formattedStartTime = localDT.toFormat("yyyy-MM-dd HH:mm:ss");
    const formattedEndTime = endDT.toFormat("yyyy-MM-dd HH:mm:ss");
    console.log("Formatted Start Time for DB:", formattedStartTime);
    console.log("Formatted End Time for DB:", formattedEndTime);
  
    // 4. Retrieve all reservations and parse them as local time.
    db.all("SELECT user_name, start_time, end_time FROM reservations ORDER BY start_time ASC", (err, reservations) => {
      if (err) return res.status(500).send("Internal Server Error");
  
      let reservationsLocal = reservations.map(r => ({
        start: DateTime.fromFormat(r.start_time, "yyyy-MM-dd HH:mm:ss", { zone: "Europe/Prague" }),
        end: DateTime.fromFormat(r.end_time, "yyyy-MM-dd HH:mm:ss", { zone: "Europe/Prague" })
      }));
  
      // 5. Check for conflict: does the new time overlap any existing reservation?
      let hasConflict = false;
      for (let r of reservationsLocal) {
        if (localDT < r.end && endDT > r.start) {
          hasConflict = true;
          break;
        }
      }
  
      if (hasConflict) {
        let latestEnd = reservationsLocal.reduce((max, r) => (r.end > max ? r.end : max), localDT);
        // Add 1 second to get the next available slot.
        let nextAvailable = latestEnd.plus({ seconds: 1 });
        let formattedNextSlot = nextAvailable.toFormat("dd/MM/yyyy, HH:mm:ss");
        console.log("Next available slot (Local):", formattedNextSlot);
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
    });
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
                <p>Whoops. The page you are looking for does not exist.</p>
                <a href="/home" class="back-button">Return to Homepage</a>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
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
