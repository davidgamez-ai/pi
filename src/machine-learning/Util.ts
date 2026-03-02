/** Collection of utility functions */

//Imports
import {DataSet, Prediction} from "./Types.js";
import {DEBUG_COMPLEXITY} from "./Debug.js";
import {DEBUG_UTIL} from "./Debug.js";

//Type of the libray used for LZUTF8 compression
declare let LZUTF8:any;


/** Returns random integer */
export function getRandomInt(min:number, max:number) {
    return Math.floor(Math.random() * (max - min)) + min;
}


/** Returns random number within the specified range */
export function getRandomNumber(min:number, max:number) {
    return Math.random() * (max - min) + min;
}


/** Rounds number to the specified number of decimal places */
export function round(val:number, decimalPlaces:number):number{
    val = val * Math.pow(10, decimalPlaces);
    val = Math.round(val);
    return val / Math.pow(10, decimalPlaces);
}


/** Returns the value of the normal distribution for value x and the mean and variance */
export function normalDistribution(x:number, mean:number, sd:number):number{
    let eExponent:number = -0.5 * Math.pow((x - mean) / sd, 2);
    let y:number = (1 / ( sd * Math.sqrt(2 * Math.PI) )) * Math.pow(Math.E, eExponent);
    return y;
}


/**
 * Converts number into a two digit format for compression calculations
*/
export function convertFourDigits(num:number):string{
    const initialNum:number = num;

    //Check for zero
    if(num === 0)
        return "00";

    //Make number positive
    if(num < 0)
        num *= -1;

    //Increase numbers less than 1000
    while(num < 1000)
        num *=10;

    //Reduce numbers greater than 10
    while(num > 10000)
        num /= 10;

    //Round number using floor
    if(DEBUG_UTIL) console.log(`Converting to two digits. Initial number: ${initialNum}; Final string: ${Math.floor(num).toString()}`);
    return Math.floor(num).toString();
}


/** Converts prediction into a string suitable for compression */
export function pmString(prediction:Prediction):string{
    //Convert numbers to four decimal places before returning string
    return `t:${convertFourDigits(prediction.timeStamp)};m:${convertFourDigits(prediction.mean)};v:${convertFourDigits(prediction.standardDeviation)}`;
}


/** Returns a random prediction string.
 *  Used in the calculation of maximum crystallized intelligence, where the
 *  most accurate predictions are also the most compressible.
 * */
export function randomPMString(prediction:Prediction):string{
    //Convert numbers to four decimal places before returning string
    return `t:${convertFourDigits(Math.random())};m:${convertFourDigits(Math.random())};v:${convertFourDigits(Math.random())}`;
}


/** Returns a number between 0 and 1 that corresponds to how much the
 *  string can be compressed.
 * @param input
 */
export function getPMCompRatio(input:string){
    let compStr:string = LZUTF8.compress(input, {outputEncoding: "StorageBinaryString"});
    if(DEBUG_COMPLEXITY) console.log("PM Compression: compressed length: " + compStr.length + "; original length: " + input.length + "; ratio: " + compStr.length / input.length);

    //Run sanity check
    if(compStr.length > input.length)
        throw "MachineLearning:Util. Compressed string length should not be greater than length of original string.";

    return compStr.length / input.length;
}


/** Returns a number between 0 and 1 that corresponds to how much the
 *  array of numbers can be compressed.
 * @param input
 */
export function getEnvironmentCompRatio(input:number[]){
    let arrStr:string = JSON.stringify(input);
    let compStr:string = LZUTF8.compress(arrStr);
    if(DEBUG_COMPLEXITY) console.log("Environment Compression: compressed length: " + compStr.length + "; original length: " + arrStr.length + "; ratio: " + compStr.length / arrStr.length);
    return compStr.length / arrStr.length;
}


/** Returns mid point between two numbers */
export function getMidPoint(min:number, max:number):number{
        return min + (max-min)/2;
}

/** Returns the maximum value of the array */
export function getMax(array:number[]):number{
    let firstTime:boolean = true, max:number=0;
    for(let val of array){
        if(firstTime){
            max = val;
            firstTime = false;
        }
        else if(val > max){
            max = val;
        }
    }
    return max;
}


/** Returns the minimum value of the array */
export function getMin(array:number[]):number{
    let firstTime:boolean = true, min:number=0;
    for(let val of array){
        if(firstTime){
            min = val;
            firstTime = false;
        }
        else if(val < min){
            min = val;
        }
    }
    return min;
}


/** Each data set is split into train, validate and test sets.
 *  This returns the length of each component for the specified data set.
 * @param dataSet
 */
export function getDataSplitLengths(dataSet:DataSet, trainPercent:number, validationPercent:number):[number, number, number]{
    const currDataLength:number = dataSet.tsData.length;

    const trainLength:number = Math.floor(currDataLength * (trainPercent / 100));
    const valLength:number = Math.floor(currDataLength * (validationPercent / 100));
    const testLength:number = currDataLength - trainLength - valLength;

    return [trainLength, valLength, testLength];
}

