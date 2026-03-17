import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.3.0/+esm';

const db = new Dexie("cardapioDB");
db.version(1).stores({
    food: "++id"
})

export default db;