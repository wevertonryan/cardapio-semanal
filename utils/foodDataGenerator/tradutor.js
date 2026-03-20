import foods from "./data/foods.js";
import translatte from 'translatte';
import translations from "./data/translations.js";
import { writeFileSync } from "node:fs";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function writeFile(foodDataArray){
    const content = "const translations = " + JSON.stringify(foodDataArray) + "\nexport default translations;";
    writeFileSync(__dirname + "/data/translations.js", content, "utf-8");
}

for(const food of foods){
    try {
        const traducao = translations[food.name];
        if(!traducao){
            throw new Error("tradução não existente!")
        }
        food.name = traducao;
    } catch(error) {
        await translatte(food.name, { to: 'pt' })
        .then(res => translations[food.name] = res.text)
        .catch(err => console.error(err));
        
        await new Promise(resolve => {
            setTimeout(resolve(), 1000)
        })
        console.log(translations[food.name])
    }
}
console.log(translations)
//writeFile(translations)


