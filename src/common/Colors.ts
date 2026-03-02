import {getRandomInt} from "../machine-learning/Util.js";

/** Collection of utiltity functions for handling colours.
 * */

/** Returns a random color */
export function getRandomColor():string{
    let red:number = getRandomInt(0, 255);
    let green:number = getRandomInt(0, 255);
    let blue:number = getRandomInt(0, 255);
    return "rgb(" + red + "," + green + "," + blue + ")";
}


/** Returns an array of random colors distributed across spectrum
 * Ignores blue component.
 * */
export function getRandomColors(numColors:number):string[]{
    const colorArray:string[] = [];

    //Number of red and green values
    let numRed:number = Math.floor( Math.sqrt(numColors) );
    let numGreen:number = Math.floor(numColors / numRed);

    //Interval between red and green
    const redInterval:number = Math.floor(255 / numRed);
    const greenInterval:number = Math.floor(255 / numGreen);

    //Generate colors maximally separated on red and green.
    for(let red:number=0; red<numRed; ++red){
        for(let green:number=0; green<numGreen; ++green){
            colorArray.push(`rgb(${red * redInterval}, ${green * greenInterval}, 0)`);
        }
    }

    //Might need one more to handle rounding errors
    if(colorArray.length === numColors-1){
        colorArray.push(getRandomColor());
    }

    //Check that array is right length
    if(colorArray.length !== numColors)
        throw `Color array is not the right length! numColors: ${numColors}; Color array length: ${colorArray.length}`;
    return colorArray;
}

