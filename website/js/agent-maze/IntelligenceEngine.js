import * as Prob from "./Probability.js";
import { DEBUG_FLUID_INTELLIGENCE, DEBUG_CRYSTALLIZED_INTELLIGENCE, DEBUG_MAX_CI } from "./Debug.js";
import * as Util from "./Util.js";
import { PolynomialRegression } from "../polynomial-regression/PolynomialRegression.js";
import { POLYNOMIAL_WINDOW_DEFAULT } from "./Globals.js";
/** Runs predictive intelligence calculations */
export class IntelligenceEngine {
    /**
     * Holds measurements of intelligence
     *  First key is the time stamp,
     *  Second key is the ID of the maze
     *  Array holds details of the measurement.
     * */
    iMeasurements = {};
    //Reference to the maze manager
    mazeManager;
    /** Carries out an approximation to Kolmogorov complexity  */
    complexity;
    //Values for total crystallized intelligence graph
    ciTotalXArray = [];
    ciTotalYArray = [];
    /** Values of crystallized intelligence per maze considered independently
     * First key is the time stamp,
     *  Second key is the ID of the maze
     *  ci points to value of crystallized intelligence.
     */
    ciMazePlot;
    /** Maximum values of crystallized intelligence per maze */
    mazeMaxCIs = {};
    //Values for total fluid intelligence graph
    fiXArray = [];
    fiYArray = [];
    /** How many points before and after the point will be used to calculate
     * the polynomial function. */
    polynomialWindow = POLYNOMIAL_WINDOW_DEFAULT;
    /* Maximum crystallized intelligence */
    maxCI = 0;
    constructor(mazeManager, complexity) {
        this.mazeManager = mazeManager;
        this.complexity = complexity;
        this.ciMazePlot = {};
    }
    /** Returns the match between a prediction and what actually happened.
     * Calculated using the Hellinger distance between a prediction made by the agent
     * and the state corresponding to the prediction.
     * The match of a random distribution is subtracted from the distance. */
    getMatch(predDist, actualDist) {
        if (DEBUG_CRYSTALLIZED_INTELLIGENCE)
            console.log("INTELLIGENCE. Prediction: " + JSON.stringify(predDist) + "; Actual: " + JSON.stringify(actualDist));
        //Calculate the total distance between the two probability distributions
        let matchPredActual = Prob.totalMatch(predDist, actualDist);
        //If the agent guesses randomly it will assign equal probability to all states
        let randomDist = Util.newStateDist(1.0 / 3.0);
        //Get the distance of the random guess from the actual state
        let matchRandomActual = Prob.totalMatch(randomDist, actualDist);
        //Subtract random guess distance from the distance of the predictions
        let finalMatch = matchPredActual - matchRandomActual;
        //Calculate best possible match
        //A perfect match would be 4, so subtract random match from perfect match
        let bestMatch = 4 - matchRandomActual;
        if (DEBUG_CRYSTALLIZED_INTELLIGENCE)
            console.log("INTELLIGENCE. Hellinger distances: pred vs actual: " + matchPredActual + "; random vs actual: " + matchRandomActual + "; finalMatch: " + finalMatch + "; bestMatch: " + bestMatch);
        //Take absolute value to avoid negative values - it takes intelligence to guess worse than chance.
        if (finalMatch < 0)
            return [-1 * finalMatch, bestMatch];
        return [finalMatch, bestMatch];
    }
    /** Adds a measure of intelligence */
    addMeasurement(timeStamp, mazeID, iMeasure) {
        //Add data structures if necessary
        if (this.iMeasurements[timeStamp] === undefined) {
            this.iMeasurements[timeStamp] = {};
        }
        if (this.iMeasurements[timeStamp][mazeID] === undefined) {
            this.iMeasurements[timeStamp][mazeID] = [];
        }
        //Store measurement
        this.iMeasurements[timeStamp][mazeID].push(iMeasure);
        if (mazeID === "23") {
            console.log(`Timestamp: ${timeStamp}; mazeID: ${mazeID}`);
            console.log(iMeasure);
        }
    }
    /** Returns the number of measurements for the specified time stamp and maze
     *
     * @param timeStamp
     * @param mazeID
     */
    getMeasurementCount(timeStamp, mazeID) {
        if (this.iMeasurements[timeStamp] === undefined)
            return 0;
        if (this.iMeasurements[timeStamp][mazeID] === undefined)
            return 0;
        return this.iMeasurements[timeStamp][mazeID].length;
    }
    /** Recalculates intelligence for the specified timestamp.
     * */
    updateIntelligence(timeStamp) {
        //Check timestamp exists in intelligence measurement
        if (this.iMeasurements[timeStamp] === undefined)
            throw `IntelligenceEngine.updateIntelligence: Timestamp: ${timeStamp} does not exist.`;
        //Sum up the intelligence for all the mazes at this timestamp value
        let allMazesPMTotal = 0, allMazesMaxPMTotal = 0;
        //Work through maze IDs
        const mazeIDsArray = []; //Store the IDs of the mazes at this time stamp for compression calculation
        for (let mazeID in this.iMeasurements[timeStamp]) {
            if (DEBUG_CRYSTALLIZED_INTELLIGENCE)
                console.log(`Calculating intgelligence for maze ${mazeID}`);
            mazeIDsArray.push(mazeID);
            //Work through measurements for this maze
            let mazePMTotal = 0, maxMazePMTotal = 0;
            for (let measure of this.iMeasurements[timeStamp][mazeID]) {
                //Multiply the accuracy of the prediction by the compressibility
                mazePMTotal += measure.predMatch * measure.predCompress;
                maxMazePMTotal += measure.maxMatch * measure.actualCompress;
                if (DEBUG_MAX_CI)
                    console.log("predDistance: " + measure.predMatch + "; maxDist: " + measure.maxMatch + "; predCompress: " + measure.predCompress + "; actual compress: " + measure.actualCompress);
            }
            //Add PM to total across all mazes
            allMazesPMTotal += mazePMTotal;
            allMazesMaxPMTotal += maxMazePMTotal;
            //Get individual compressibility for this maze
            const mazeCompressionRatio = this.complexity.getMazesCompressionRatio_LZUTF8([mazeID]);
            //Calculate CI for this maze at this timestamp
            const mazeCI = this.calculateCrystallizedIntelligence(mazePMTotal, mazeCompressionRatio);
            //Calculate maximum CI for this maze at this timestamp
            const maxMazeCI = this.calculateCrystallizedIntelligence(maxMazePMTotal, mazeCompressionRatio);
            //Store CI for this maze at this timestamp for plotting
            if (this.ciMazePlot[mazeID] === undefined)
                this.ciMazePlot[mazeID] = { x: [], y: [] };
            this.ciMazePlot[mazeID].x.push(timeStamp);
            this.ciMazePlot[mazeID].y.push(mazeCI);
            //Store max CI for this maze
            this.mazeMaxCIs[mazeID] = maxMazeCI;
        }
        //Get joint compressibility of mazes at this time stamp
        let allMazesCompressibility = this.complexity.getMazesCompressionRatio_LZUTF8(mazeIDsArray);
        //Multiply the total intelligence by the compressibility of the combined environments
        let finalCI = this.calculateCrystallizedIntelligence(allMazesPMTotal, allMazesCompressibility);
        let finalMaxCI = this.calculateCrystallizedIntelligence(allMazesMaxPMTotal, allMazesCompressibility);
        //The x axis for crystallized intelligence corresponds to the timestamp
        this.ciTotalXArray.push(timeStamp);
        //Add crystalized intelligence calculation for plot
        this.ciTotalYArray.push(finalCI);
        if (DEBUG_CRYSTALLIZED_INTELLIGENCE)
            console.log("Crystallized intelligence: " + finalCI + "; Max CI: " + finalMaxCI);
        //Store max CI for user display
        this.maxCI = finalMaxCI;
        //Calculate fluid intelligence for this point
        this.updateFluidIntelligence();
    }
    /** Carries out an individual calcluation of crystallized intelligence */
    calculateCrystallizedIntelligence(pmSum, compressionRatio) {
        //Multiply the total prediction match by the compressibility of the environment(s)
        let ci = pmSum * compressionRatio;
        /* Take the base 2 log if number is greater than 1.
            otherwise round to zero */
        if (ci > 1)
            ci = Math.log2(ci);
        else
            ci = 0;
        return ci;
    }
    /** Uses the polynomial approximation to calculate dCI/dt */
    updateFluidIntelligence() {
        //Clear arrays
        this.fiXArray = [];
        this.fiYArray = [];
        //Work through crystalized intelligence array for points within polynomial window
        for (let i = this.polynomialWindow; i < this.ciTotalXArray.length - this.polynomialWindow; ++i) {
            //Get the polynomial approximating the window at this point
            let terms = this.getPolynomialTerms(i);
            //Calculate the slope, which corresponds to the fluid intelligence
            let slope = this.getSlope(terms, i);
            //Add numbers to arrays
            this.fiXArray.push(i);
            this.fiYArray.push(slope);
        }
    }
    /** Returns the terms for a polynomial that fits the points around the specified point
     * @param x
     */
    getPolynomialTerms(x) {
        //Only calculate polynomial if we have enough data.
        if (x - this.polynomialWindow < 0 || x + this.polynomialWindow >= this.ciTotalXArray.length)
            return [];
        //Get historical PI data in a form suitable for the PolynomialRegression library
        let data = this.getPolynomialData(x - this.polynomialWindow, x + this.polynomialWindow);
        //Use Polynomial Regression library to get an approximation to points
        const model = PolynomialRegression.read(data, 3);
        return model.getTerms();
    }
    /** Calculates differential of polynomial to get the slope */
    getSlope(terms, x) {
        //First differentiate the terms
        let differential = [];
        for (let i = 1; i < terms.length; ++i) { //Ignore first entry, which disappears in the differential
            if (i === 1) {
                differential.push(terms[i]);
            }
            else {
                differential.push(i * terms[i]);
            }
        }
        if (DEBUG_FLUID_INTELLIGENCE)
            console.log("IEngine. Differential terms: " + JSON.stringify(differential));
        //Use the terms to calculate the slope and return it
        let slope = this.calculatePolynomialResult(differential, x);
        if (DEBUG_FLUID_INTELLIGENCE)
            console.log("IEngine. Slope: " + slope);
        return slope;
    }
    /** Returns part of the crystallized intelligence arrays
     * in a format suitable for the Polynomial Regression library.
     * @param xStart
     * @param xEnd
     */
    getPolynomialData(xStart, xEnd) {
        //Run a couple of checks
        if (xStart < 0)
            throw "getPolynomialData. xStart out of range: " + xStart;
        if (xEnd > this.ciTotalXArray.length)
            throw "getPolynomialData. xEnd out of range: " + xEnd;
        const data = [];
        for (let i = xStart; i < xEnd; i++) {
            data.push({
                x: i,
                y: this.ciTotalYArray[i]
            });
        }
        return data;
    }
    /** Uses the polynomial specified in the terms argument to calculate the value
     * of y for the given value of x.
     * @param terms
     * @param x
     */
    calculatePolynomialResult(terms, x) {
        let result = 0;
        for (let i = 0; i < terms.length; ++i) {
            if (i === 0) {
                result += terms[i];
            }
            else {
                result += terms[i] * Math.pow(x, i);
            }
        }
        return result;
    }
}
