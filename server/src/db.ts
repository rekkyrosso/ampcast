import sqlite3 from 'sqlite3';
import {dbName} from './config';
console.log(`Create database ${dbName}`);
const db = new sqlite3.Database(dbName);
console.log(`Database created.`);
export default db;
