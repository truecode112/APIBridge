import pkg from 'sqlite3';
const sqlite3 = pkg.verbose();
import fs from 'fs';

const filePath = "./apibridge.db";

export const createDbConnection = () => {
  if (fs.existsSync(filePath)) {
    return new sqlite3.Database(filePath);
  }
  const db = new sqlite3.Database(filePath, (error) => {
    if (error) {
      return console.error('Failed to sqlite datbase', error.message);
    }
    createTable(db);
  });
  console.log("Connected to SQLite");
  return db;
}

function createTable(db) {
  db.exec(`
    CREATE TABLE Entries(
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      JobId INTEGER NOT NULL,
      JobNumber varchar(255) NOT NULL,
      JobStatus varchar(50) NOT NULL,
      CallNumber varchar(255) NOT NULL,
      CallStatus varchar(50) NOT NULL,
      MfgId varchar(255),
      FSSCallId varchar(255),
      FirstName varchar(255),
      LastName varchar(255),
      Address1 varchar(255),
      Address2 varchar(255),
      State varchar(255),
      Country varchar(255),
      City varchar(255),
      ZipCode varchar(255),
      Email varchar(255),
      Description varchar(255),
      CallCreatedAt datetime,
      CallUpdatedAt datetime,
      JobCreatedAt datetime,
      JobUpdatedAt datetime
    );
  `);
}

export const getEntry = (jobNumber, callNumber) => {
  return new Promise((resolve, reject) => {
    const db = createDbConnection();
    db.all(`SELECT * FROM Entries WHERE JobNumber = ? OR CallNumber = ?`,
      [jobNumber, callNumber], (error, row) => {
        if (error) {
          return reject(error);
        }
        return resolve(row[0]);
      });
  })
}

export const getAllEntries = () => {
  return new Promise((resolve, reject) => {
    const db = createDbConnection();
    db.all(`SELECT * FROM Entries`,
      [], (error, row) => {
        if (error) {
          return reject(error);
        }
        return resolve(row);
      });
  })
}

export const insertEntry = (jobId, jobNumber, jobStatus, callNumber, callStatus, mfgId, fssCallId, firstName, lastName, address1, address2, state, country, city, zipcode, email, desc, callCreatedOn) => {
  return new Promise((resolve, reject) => {
    const db = createDbConnection();
    db.run(`INSERT INTO Entries (JobId, JobNumber, JobStatus, MfgId, FSSCallId, CallNumber, CallStatus, FirstName, LastName, Address1, Address2, State, Country, City, ZipCode, Email, Description, CallCreatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [jobId, jobNumber, jobStatus, callNumber, callStatus, mfgId, fssCallId, firstName, lastName, address1, address2, state, country, city, zipcode, email, desc, callCreatedOn],
      function(error) {
        if (error) {
          return reject(error);
        }
        return resolve(this.lastID);
      });
  })
}

export const updateCallStatus = (callNumber, callStatus) => {
  return new Promise((resolve, reject) => {
    const db = createDbConnection();
    db.run(`UPDATE Entries SET CallStatus = ? WHERE CallNumber = ?`,
      [callStatus, callNumber]),
      function(error) {
        if (error) {
          return reject(error);
        }
        return resolve("");
      }
  })
}

export const updateJobStatus = (jobNumber, jobStatus, jobUpdatedAt) => {
  return new Promise((resolve, reject) => {
    const db = createDbConnection();
    db.run(`UPDATE Entries SET JobStatus = ?, JobUpdatedAt = ? WHERE JobNumber = ?`,
      [jobStatus, jobUpdatedAt, jobNumber]),
      function(error) {
        if (error) {
          return reject(error);
        }
        return resolve("");
      }
  })
}

export const updateJobInfo = (callNumber, jobId, jobNumber, jobStatus, jobCreatedAt) => {
  return new Promise((resolve, reject) => {
    const db = createDbConnection();
    db.run(`UPDATE Entries SET JobId = ?, JobNumber = ?, JobStatus = ?, JobCreatedAt = ? WHERE CallNumber = ?`,
      [jobId, jobNumber, jobStatus, jobCreatedAt, callNumber]),
      function(error) {
        if (error) {
          return reject(error);
        }
        return resolve("");
      }
  })
}