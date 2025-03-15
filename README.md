# Udemy Reservation Sharing Tool

A **private reservation system** for sharing a **single Udemy account** among team members without getting flagged for "suspicious activity." 
## Features
- **Book a Time Slot** 
- **Prevents Overlapping Reservations** 

## How It Works
1. **Log in** with your credentials.
2. **Pick a time slot**.
3. **Book your reservation** and enjoy exclusive, uninterrupted access.
4. **Watch Udemy courses** without getting locked out mid-lesson.


## Installation and Basic Workflow
```bash
# Clone the repository
git clone https://github.com/nataliefedorjakova/udemy.git
cd udemy

# Install dependencies
npm install

# Start the server
node app.js

#To clear all reservations and start with a clean slate, follow these intstructions:
node
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
db.run("DELETE FROM reservations", function(err) {
    if (err) {
        console.error("Error clearing reservations:", err.message);
    } else {
        console.log("Table cleared");
    }
});
.exit

#Manually adding an admin user:
node
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const hashedPassword = bcrypt.hashSync("adminpassword", 10);
db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["admin", hashedPassword], () => {
    console.log("Admin user created");
});

```
## Insert new users
Open up __insert_users.js__ and add a new user into const users array.

## Future (ambitious) plans:
- Using clock instead of picking your times manually
- Testing edge cases
- Accessing the account using virtual remote desktop
- Formatting the page so it's not such an eyesore
- Creating several accounts with own unique passwords
- Adding information about who currently has the time slot booked
- Fixing up Quick Reservation and Reservation pages

