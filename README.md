# Udemy Reservation Sharing Tool

A **private** reservation system for a single Udemy account. 
**Scenario:** you have an account that allows only one person to use it. Well, as it would never occur to you to share it among, dunno, team members of your elite work team, you can book a slot whenever you (and only you!) feel like using it. Just for funsies.

## Features
- **Book a Time Slot** 
- **Prevents Overlapping Reservations** 

## How It Works
1. **Log in** with your username.
2. **Pick a time slot**.
3. **Book your reservation** either well in advance or via quick-booking (which books it for right now).
4. **Watch courses** without getting locked out mid-lesson (hopefully).


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





