import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { Uint8ArrayReader, BlobReader, ZipReader, TextWriter } from "@zip.js/zip.js";
import * as cheerio from "cheerio";

import translations from "./data/translations.js";
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

async function contentToArrayFoodValidObj(content){
    const arrayFoodValidObj = [];
    try {
        const jsonConteudo = JSON.parse(content); // Converte para Objeto
        for(const food of jsonConteudo.FoundationFoods){
            const foodValidObj = await _foodToValidObj(food);
            arrayFoodValidObj.push(foodValidObj);
        }
        return arrayFoodValidObj;
    } catch(error) {
        throw error;
    }
}

// colocar nutrients em uma tabela separada
async function _foodToValidObj(food){
    const name = await traslatedName(food.description);
    //const image = await getOnlineImage(food.description);
    const nutrients = {};
    food.foodNutrients.forEach(foodNutrient => {
        const name = _nutrientName(foodNutrient.nutrient.id);
        if(!name) return;
        const {amount, unitName} = unitConverter(foodNutrient.amount, foodNutrient.nutrient.unitName)
        const validFoodNutrient = {
            name: name,
            amount: amount,
            unitName: unitName
        }
        nutrients[foodNutrient.nutrient.id] = validFoodNutrient;
    });
    const validFood = {
        "name": name,
        //"image": image,
        "nutrients": nutrients
    };
    return validFood;
}

async function traslatedName(foodName){
    let traducao = foodName;
    try {
        const traducaoForn = translations[foodName];
        if(!traducaoForn){
            throw new Error("tradução não existente!")
        }
        traducao = traducaoForn;
    } catch(error) {
        await translatte(foodName, { to: 'pt' })
        .then(res => translations[foodName] = res.text)
        .catch(err => console.error(err));
        
        await new Promise(resolve => {
            setTimeout(resolve(), 1000)
        })
        traducao = translations[foodName]
    } finally {
        return traducao;
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

async function getOnlineImage(foodName){
    let image = new Blob();
    try {
        const response = await fetch("https://api.openverse.org/v1/images/?q=" + _firstFoodName(foodName));
        const result = await response.json();
        //console.log(result.results[0])
        const link = result.results[0].url;
        
        const imageContent = await fetch(link)
        image = await imageContent.text();
    } catch(error) {
        console.error("Failed to get an image: " + error.message);
    } finally {
        return image;
    }
}

function _firstFoodName(foodName){
    let index = foodName.indexOf(",")
    if(index == -1) {
        index = foodName.length
    };
    return foodName.slice(0, index)
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

function writeFile(fileName, data){
    const content = `const ${fileName} = ${JSON.stringify(data)}\nexport default ${fileName};`;
    writeFileSync(`${__dirname}/data/${fileName}.js`, content, "utf-8");
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
            console.log("- Failed to get online data: " + error.message);
            content = await getLocalData();
        }
        console.log("- Sucess getting the data")
        const foodArrayValidObj = await contentToArrayFoodValidObj(content);
        writeFile("foods", foodArrayValidObj);
        writeFile("translations", translations);
        console.log("- File genereted with sucess!")
    } catch(error) {
        console.log("- Failed on opperation, aborting!\n- Message: " + error);
    }
}

await main();

//console.log(await getOnlineImage("grape, Raw, game"))