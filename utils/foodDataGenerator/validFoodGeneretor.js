import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { BlobReader, ZipReader, TextWriter } from "@zip.js/zip.js";
import foods from "./data/foods.js";


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

/*
 - Olhar arquivos que tem dentro da pasta
 - procurar 
*/
function getCorrectFile(path = "./data/"){
    let finalFileName;
    const files = readdirSync(path);
    const filesName = files.filter(fileName => /.*?foundation.*?food.*?json.*?/.test(fileName));

    finalFileName = filesName.find(fileName => /.*?.json/.test(fileName));
    if(!finalFileName){
        finalFileName = filesName.find(fileName => /.*?.zip/.test(fileName));
    }
    if(!finalFileName){
        throw new Error("Não existe nem um arquivo válido para pegar os dados")
    }
    
    return finalFileName;
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
        "name": food.description,
        "nutrients": {}
    };
    food.foodNutrients.forEach(foodNutrient => {
        const name = _nutrientName(foodNutrient.nutrient.id);
        if(!name) return;
        const {amount, unitName} = unitConverter(foodNutrient.amount, foodNutrient.nutrient.unitName)
        const validFoodNutrient = {
            name: name,
            amount: amount,
            unitName: unitName
        }
        validFood.nutrients[foodNutrient.nutrient.id] = validFoodNutrient;
    });
    return validFood;
}

function _nutrientName(id){
    switch(id){
            case 1008:
                return "Energia";
            case 1003:
                return "Proteina";
            case 1005:
                return "Caboidrato";
            case 1004:
                return "Gordura";
            case 1079:
                return "Fibra";
            case 1162:
                return "Vitamina C";
            case 1087:
                return "Cálcio";
            case 1089:
                return "Ferro";
            case 1090:
                return "Magnésio";
            case 1095:
                return "Zinco";
            case 1092:
                return "Potásio";
            case 1109:
                return "Vitamina E";
            case 1106:
                return "Vitamina";
            default:
                return;
        }
}

function unitConverter(amount, unitInput){
    switch(unitInput){
        case "mg":
        return {amount: amount * 0.001, unitName: "g"}
        case "μg":
        return {amount: amount * 0.000001, unitName: "g"}
        default:
        return {amount: amount, unitName: unitInput}
    }
}

/*
* 1008 Energy
* 1003 Protein
* 1005 Carbohydrate, by difference
* 1004 Total lipid (fat)
* 1079 Fiber
* 1162 Vitamin C
* 1087 Calcium
* 1089 Iron
* 1090 Magnesium
* 1095 Zinc
* 1092 Potassium
* 1106 Vitamin A
* 1109 Vitamin E
*/

// pegar link de maneira automática, Baixar dados online, descompactar e enviar o conteúdo
async function getOnlineData(){
    const baseUrl = "https://fdc.nal.usda.gov/"
    const link = await getCorrectLink(baseUrl);
    const blob = await getOnlineFoodDataZip(link)
    const content = await descompressFoodDataZip(blob)
    return content;
}

// pegar os dados locais, se estiver compactado descompactar, ler e enviar o conteúdo
function getLocalData(){
    const fileName = getCorrectFile();
}

/* pegar o conteúdo dos arquivos, realizar a conversão para um formato válida
 - Ver se tem uma versão nova disponível, caso não nem faz
 - Tenta baixar, caso não consiga aborta operação
 - Se não existir um foods.js ou foods.json ele vai criar um do zero se tiver o json ou zip
 - Tirar conteúdo desnecessário
 - Estruturar de maneira correta
 - Adicionar imagens automáticamente
 - Traduzir conteúdo para português
 - Gravar em um arquivo foods.js preparado para export  
*/
async function main(){
    try {
        const content = await getOnlineData();
        const foodArrayValidObj = contentToArrayFoodValidObj(content);
        console.log(foodArrayValidObj[1]);
    } catch(error) {
        console.log(error.message);
    }
}

await main();

//console.log(foods[1])