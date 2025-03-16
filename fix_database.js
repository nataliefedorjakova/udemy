const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db", (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

db.serialize(() => {
    db.run("ALTER TABLE reservations RENAME TO old_reservations", (err) => {
        if (err) {
            console.error("Error renaming table:", err.message);
            return;
        }
        console.log("Old reservations table renamed.");

        db.run(`
            CREATE TABLE reservations (
                id INTEGER PRIMARY KEY, 
                user_name TEXT, 
                start_time TEXT, 
                end_time TEXT
            )
        `, (err) => {
            if (err) {
                console.error("Error creating new table:", err.message);
                return;
            }
            console.log("New reservations table created.");

            db.run(`
                INSERT INTO reservations (id, start_time, end_time)
                SELECT id, start_time, end_time FROM old_reservations
            `, (err) => {
                if (err) {
                    console.error("Error copying data:", err.message);
                    return;
                }
                console.log("Data copied to new table.");

                // Step 4: Drop the old table
                db.run("DROP TABLE old_reservations", (err) => {
                    if (err) {
                        console.error("Error dropping old table:", err.message);
                        return;
                    }
                    console.log("Old reservations table dropped.");
                    console.log(" Database structure updated successfully!");
                });
            });
        });
    });
});
