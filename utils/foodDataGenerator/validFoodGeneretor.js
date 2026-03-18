import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { BlobReader, ZipReader, TextWriter } from "@zip.js/zip.js";
import foods from "./foods.js";

const baseUrl = "https://fdc.nal.usda.gov"
async function getCorrectLink(baseUrl, downloadPath = "download-datasets"){
    try {
        const page = await (await fetch(baseUrl + downloadPath)).text();
        const path = page.match(/href="([^"]*?foundation.*?food.*?json[^"]*?)"/)[1];
        if(path) return baseUrl + path;
        return null;
    } catch(error) {
        throw error;
    }
}

async function getOnlineFoodDataZip(url){
    try { 
        const response = await fetch(url);
        const blob = await response.blob();
        return blob;
    } catch(error) { 
        throw error;
    };
}

function getLocalFoodData(){
    const files = readdirSync(".");
    const fileName = files.find(fileName => /.*?foundation.*?food.*?json.*?.json/.test(fileName));
    console.log(fileName)
}

async function descompressFoodDataZip(zipFileBlob){
    const textWriter = new TextWriter()
    const zipFileReader = new BlobReader(zipFileBlob);
    const zipReader = new ZipReader(zipFileReader);
    const firstEntry = (await zipReader.getEntries()).shift();
    const content = await firstEntry.getData(textWriter);
    await zipReader.close();
    return content;
}

function contentToArrayFoodValidObj(content){
    const arrayFoodValidObj = [];
    try {
        const jsonConteudo = JSON.parse(content); // Converte para Objeto
        jsonConteudo.FoundationFoods.forEach(food => {
            const foodValidObj = _foodToValidObj(food);
            arrayFoodValidObj.push(foodValidObj);
        });
        return arrayFoodValidObj;
    } catch(error) {
        throw error;
    }
}

const nutrientsId = [1008, 1005, 1004, 1003, 1162, 1106, 1087, 1089, 1090, 1095, 1092, 1079, 1109];
// colocar nutrients em uma tabela separada
function _foodToValidObj(food){
    const validFood = {
        description: food.description,
        nutrients: []
    };
    food.foodNutrients.forEach(foodNutrient => {
        if(!nutrientsId.includes(foodNutrient.nutrient.id)) {
            return;
        };
        const validFoodNutrient = {
            name: foodNutrient.nutrient.name,
            unitName: foodNutrient.nutrient.unitName,
            amount: foodNutrient.amount
        }
        validFood.nutrients.push(validFoodNutrient);
    });
    return validFood;
}

async function getOnlineData(){
    const link = await getCorrectLink(baseUrl);
    const blob = await getOnlineFoodDataZip(link)
    const content = await descompressFoodDataZip(blob)
    return content;
}

function getLocalData(){
    getLocalFoodData();
}

async function main(){
    try {
        getLocalData()
    } catch(error) {
        console.log(error.message);
    }
}

await main();