/** Collection of statistical functions */

/** Returns the mean/expected value of numbers in array */
export function mean(array:number[]):number{
    let sum:number = 0;
    for(let val of array){
        sum += val;
    }
    return sum/array.length;
}


/** Returns the sample standard deviation of an array of numbers */
export function sampleStandardDeviation(mean:number, array:number[]){
    let total:number = 0;
    for(let val of array){
        total += Math.pow( (val - mean), 2);
    }
    return Math.sqrt(1/(array.length - 1) * total );
}