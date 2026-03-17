import { BlobReader, ZipReader, TextWriter } from "https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.8.23/+esm";

const url = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2025-12-18.zip"
async function getFoodDataZip(){
    const response = await fetch(url);
    try { 
        const blob = await response.blob();
        return blob;
    } catch(error) { 
        throw error;
    };
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
        nutrients: {}
    };
    food.foodNutrients.forEach(foodNutrient => {
        if(!nutrientsId.includes(foodNutrient.nutrient.id)) {
            return;
        };
        const validFoodNutrient = {
            unitName: foodNutrient.nutrient.unitName,
            amount: foodNutrient.amount
        }
        validFood.nutrients[foodNutrient.nutrient.name] = validFoodNutrient;
    });
    return validFood;
}

export default async function importData(){
    try {
        const blob = await getFoodDataZip();
        const content = await descompressFoodDataZip(blob);
        const arrayFoodValidObj = contentToArrayFoodValidObj(content);
        return arrayFoodValidObj;
    } catch(error) {
        console.log(error.message);
    }
}