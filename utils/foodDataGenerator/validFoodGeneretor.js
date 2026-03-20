import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { Uint8ArrayReader, BlobReader, ZipReader, TextWriter } from "@zip.js/zip.js";
//import foods from "./data/foods.js";



import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseFoundationExp = ".*?foundation.*?food.*?json"
async function getCorrectLink(baseUrl, downloadPath = "download-datasets"){
    try {
        const page = await (await fetch(baseUrl + downloadPath)).text();
        
        const exp = new RegExp(`href="([^"]${baseFoundationExp}[^"]*?)"`)
        const path = page.match(exp)[1];
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
    
    const expString = baseFoundationExp + ".*?";
    const exp = new RegExp(expString);
    const filesName = files.filter(fileName => exp.test(fileName));

    const validFormats = ["json", "zip"];
    for(let i = 0; i < validFormats.length; i++){
        const expString = ".*?." + validFormats[i];
        const exp = new RegExp(expString);
        finalFileName = filesName.find(fileName => exp.test(fileName));
        if(finalFileName){
            return finalFileName;
        }
    }
    throw new Error("Não existe nem um arquivo válido para pegar os dados");
}

function fileFormat(fileName){
    let format = ""
    for(let i = fileName.length - 1; i > -1; i--){
        if(fileName[i] != "."){
            format = fileName[i] + format;
            continue;
        }
        return format;
    }
    return undefined;
}

async function descompressFoodDataZip(zipFileReader){
    const textWriter = new TextWriter()
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
                return "Vitamina A";
            default:
                return;
        }
}

function unitConverter(amount, unitInput){
    const ug = String.fromCharCode(181, 103)
    switch(unitInput){
        case "mg":
        return {amount: roundTo(amount * 0.001, 3), unitName: "g"};
        case ug:
        return {amount: roundTo(amount * 0.000001, 3), unitName: "g"}
        default:
        return {amount: amount, unitName: unitInput}
    }
}

function roundTo(num, precision) {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

async function addImages(foodName){
    await fetch("https://unsplash.com/s/photos/" + foodName)
    
}

// pegar link de maneira automática, Baixar dados online, descompactar e enviar o conteúdo
async function getOnlineData(){
    const baseUrl = "https://fdc.nal.usda.gov/"
    const link = await getCorrectLink(baseUrl);
    const blob = await getOnlineFoodDataZip(link)
    console.log(blob)
    const blobReader = new BlobReader(blob);
    console.log(blobReader)
    const content = await descompressFoodDataZip(blobReader)
    return content;
}

// pegar os dados locais, se estiver compactado descompactar, ler e enviar o conteúdo
async function getLocalData(){
    const path = __dirname + "/data/"
    const fileName = getCorrectFile(path);
    let content = readFileSync(path + fileName);
    if(fileFormat(fileName) == "zip"){
        const bufferReader = new Uint8ArrayReader(content);
        content = await descompressFoodDataZip(bufferReader);
    }
    return content;
}

function writeFile(foodDataArray){
    const content = "const foods = " + JSON.stringify(foodDataArray) + "\nexport default foods;";
    writeFileSync(__dirname + "/data/foods.js", content, "utf-8");
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
    console.log("Starting generate a valid food file!");
    try {
        let content;
        try {
            content = await getLocalData()
        } catch(error){
            console.log("- Failed to get online data: " + error.message)
            content = await getLocalData();
        }
        console.log("- Sucess getting the data")
        const foodArrayValidObj = contentToArrayFoodValidObj(content);
        writeFile(foodArrayValidObj);
        console.log("- File genereted with sucess!")
    } catch(error) {
        console.log("- Failed on opperation, aborting!\n- Message: " + error);
    }
}

await main();

//console.log(foods[1])

//https://www.google.com/search?q=