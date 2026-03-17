import importData from "./utils/importer.js";
import db from "./utils/localDatabase.js";

async function updateData(){
    const exist = await db.food.count();
    console.log(exist)
    if(exist > 0) return;
    const data = await importData();
    try {
        await db.food.bulkPut(data)
    } catch(error) {
        alert(error.message)
    }
}

//console.log(query)

await updateData();