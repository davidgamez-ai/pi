import { DEBUG_COMPLEXITY, DEBUG_CRYSTALLIZED_INTELLIGENCE, DEBUG_FLUID_INTELLIGENCE, DEBUG_MAX_INTELLIGENCE, DEBUG_PREDICTION_MATCH, DEBUG_PROBABILITY, MEASURE_PERFORMANCE } from "./Debug.js";
import { PolynomialRegression } from "../polynomial-regression/PolynomialRegression.js";
import { POLYNOMIAL_WINDOW_DEFAULT } from "./Constants.js";
import * as Util from "./Util.js";
import { TTest } from "../t-table/TTest.js";
import { Timer } from "../common/Timer.js";
/** Calculates fluid and crystallized intelligence for a network that predicts time series */
export class IntelligenceEngine {
    //Holds data and predictions
    data;
    //Machine learning class
    ml;
    //Holds the maximum possible CI for each data set
    dataSetCIMax = [];
    //The maximum possible CI across all data sets.
    ciMax;
    //Values for prediction match graph. First index is the dataset
    pmXArray = [];
    pmYArray = [];
    //Values of total crystallized intelligence across all data sets
    ciXArray = [];
    ciYArray = [];
    /* Values of crystallized intelligence for each data set considered independently
        First index is the data set.     */
    dsCIXArray = [];
    dsCIYArray = [];
    //Values for fluid intelligence graph
    fiXArray = [];
    fiYArray = [];
    /* Threshold for calcluation of match using t-test */
    pValue;
    //Window used for the polynomial approximation for the fluid intelligence calculation
    polynomialWindow = POLYNOMIAL_WINDOW_DEFAULT;
    //Compressiblity of all environments considered together. Stored to visualize to user
    totalEnvironmentCompressibility = 0;
    //Compressibility of each environment considered separately. Stored for user information
    dataSetCompressibility = [];
    /** Re-calculates crystallized and fluid intelligence from data */
    update() {
        this.updateCrystallizedIntelligence();
        this.updateFluidIntelligence();
    }
    /** Re-calculates crystallized intelligence. */
    updateCrystallizedIntelligence() {
        //Start timer
        if (MEASURE_PERFORMANCE)
            Timer.start();
        //Build a string containing all predictions within the data set, so we can measure their complexity
        let pmStrings = [];
        //Work through the data sets
        for (let ds = 0; ds < this.data.dataSets.length; ++ds) {
            //Local reference for convenience
            let dataSet = this.data.dataSets[ds];
            //Create or clear arrays for this data set
            this.pmXArray[ds] = [];
            this.pmYArray[ds] = [];
            pmStrings[ds] = [];
            if (this.dsCIXArray[ds] === undefined) {
                this.dsCIXArray[ds] = [];
                this.dsCIYArray[ds] = [];
            }
            //Check that predictions are the same length as the original data minus time window.
            if (dataSet.tsData.length - this.ml.getTimeWindow() !== dataSet.predictions.length)
                throw `Mismatch between original data length (${dataSet.tsData.length}) and prediction length (${dataSet.predictions.length}).`;
            //Local copy of time window for clarity and convenience
            const timeWindow = this.ml.getTimeWindow();
            //Work through original data and predictions
            //Need to offset original data by time window.
            for (let i = 0; i < dataSet.predictions.length; ++i) {
                //Check the time stamps match
                if (dataSet.tsData[i + timeWindow].timeStamp !== dataSet.predictions[i].timeStamp)
                    throw "TimeStamp mismatch between original data and predictions: " + dataSet.tsData[i + timeWindow].timeStamp + " " + dataSet.predictions[i].timeStamp;
                //Get match between prediction and the original data item
                const prediction = dataSet.predictions[i]; //Local reference for convenience
                if (DEBUG_PREDICTION_MATCH)
                    console.log("Prediction Match. Actual data. TimeStamp: " + dataSet.tsData[i + timeWindow].timeStamp + "; value: " + dataSet.tsData[i + timeWindow].value);
                let pm = this.getPredictionMatch(dataSet.tsData[i + timeWindow].value, prediction.mean, prediction.standardDeviation);
                if (DEBUG_PREDICTION_MATCH)
                    console.log("Prediction Match. Prediction. predictionMean: " + prediction.mean + "; prediction variance: " + prediction.standardDeviation + "; prediction match: " + pm);
                //Random guess allocates an equal probability to all numbers in the range of the dataset
                const randomPredictionProbability = this.getRandomPredictionProbability(dataSet);
                //Subtract random guess
                // Set to zero if less than zero - this is different from the agent case
                let finalPM = pm - randomPredictionProbability;
                if (finalPM < 0)
                    finalPM = 0;
                //Store values in prediction match array.
                this.pmXArray[ds].push(dataSet.tsData[i + timeWindow].timeStamp);
                this.pmYArray[ds].push(finalPM);
                //Add prediction to string used to calculate prediction complexity
                pmStrings[ds].push(Util.pmString(dataSet.predictions[i]));
            }
        }
        //Store x value for this intelligence measurement.
        // The x axis for crystallized intelligence corresponds to the training cycle
        this.ciXArray.push(this.ciXArray.length);
        //Store y value for this intelligence measurement
        this.ciYArray.push(this.calculateCrystallizedIntelligence(pmStrings));
        //End timer and print result as well as mean
        if (MEASURE_PERFORMANCE)
            Timer.end("MachineLearning", true);
    }
    /** Carries out crystallized intelligence calculation
     * Starting point is prediction match without prediction compression and
     * strings corresponding to each prediction.
     * */
    calculateCrystallizedIntelligence(pmStrings) {
        //Check that the arrays are the same length
        if (this.pmYArray.length !== pmStrings.length)
            throw "Crystallized intelligence. pmYArray and pmStrings should be the same length: " + this.pmYArray.length + " " + pmStrings.length;
        if (this.data.dataSets.length !== pmStrings.length)
            throw "Crystallized intelligence. pmTotals, pmStrings and datasets should be the same length: " + this.data.dataSets.length + " " + pmStrings.length;
        //Holds Total PM summed across all datasets
        let dsPMTotal = 0;
        //Store complete data for environment compressibility calculations.
        let completeData = [];
        //Work through each data set
        for (let ds = 0; ds < this.data.dataSets.length; ++ds) {
            //Local reference for convenience
            const dataSet = this.data.dataSets[ds];
            //Add all values in data set for compressibility calculation
            for (let item of dataSet.tsData)
                completeData.push(item.value);
            //Sum up the predictions and strings within the data set
            let dsPM = 0, dsString = "";
            for (let p = 0; p < this.pmYArray[ds].length; ++p) {
                dsPM += this.pmYArray[ds][p];
                dsString += pmStrings[ds][p];
            }
            if (DEBUG_COMPLEXITY)
                console.log("Complete data length: " + completeData.length);
            //Multiply total by prediction compression ratio
            let predCom = Util.getPMCompRatio(dsString);
            dsPM *= predCom;
            //Add to overall CI total
            dsPMTotal += dsPM;
            /* Calculate CI for this data set considered independently.
                Same calculation as overall CI with data considered by itself.
             */
            //Multiply by compressibility of the environment
            let dsValues = dataSet.tsData.map(val => (val.value));
            let dsEnvComp = Util.getEnvironmentCompRatio(dsValues);
            dsPM *= dsEnvComp;
            /* Round to zero or take log2 */
            let dsCI = 0;
            if (dsPM > 1)
                dsCI = Math.log2(dsPM);
            if (DEBUG_CRYSTALLIZED_INTELLIGENCE)
                console.log(`calculateCrystallizedIntelligence: Dataset CI: ${dsCI}; Environment compression: ${dsEnvComp}; prediction compression: ${predCom}.`);
            //Store
            this.dsCIXArray[ds].push(this.dsCIXArray[ds].length);
            this.dsCIYArray[ds].push(dsCI);
        }
        //Next take compression of all environments taken together into account
        let envCom = Util.getEnvironmentCompRatio(completeData);
        dsPMTotal *= envCom;
        /* Prediction match Negative intelligence makes no sense here,
            so round to zero or take log2 */
        let ciFinal = 0;
        if (dsPMTotal > 1)
            ciFinal = Math.log2(dsPMTotal);
        //Return final value of CI
        if (DEBUG_CRYSTALLIZED_INTELLIGENCE) {
            console.log("Final CI: " + ciFinal);
        }
        return ciFinal;
    }
    /** Calculates the maximum crystallized intelligence.
     *  The total across all data sets and for each data set considered independently. */
    calculateMaxCrystallizedIntelligence() {
        //Reset and create variables for calculation.
        this.dataSetCIMax = [];
        //Stores data from all datasets for environment compressibility calculation
        const completeData = [];
        //Sums up prediction match across datasets
        let dsPMTotal = 0;
        //Work through the data sets
        for (let dataSet of this.data.dataSets) {
            //Prediction match for dataset
            let dsPM = 0;
            //Add all values in data set for compressibility calculation
            for (let item of dataSet.tsData)
                completeData.push(item.value);
            /* Build predictions for this data set */
            let dsPredictions = dataSet.tsData.map(item => ({
                timeStamp: item.timeStamp,
                mean: item.value,
                standardDeviation: -1 //Not used
            }));
            //Slice off predictions to compensate for time window
            dsPredictions = dsPredictions.slice(this.ml.getTimeWindow(), dsPredictions.length);
            //Work through predictions and sum match and string for complexity
            let predictionString = "";
            for (let pred of dsPredictions) {
                //Use random string for complexity calculation
                //The most accurate prediction has a more compressible string.
                predictionString += Util.randomPMString(pred);
                //Prediction match for near perfect prediction
                let pm = this.getPredictionMatch(pred.mean, pred.mean, pred.standardDeviation);
                //Random guess allocates an equal probability to all numbers in the range of the dataset
                const randomPredictionProbability = this.getRandomPredictionProbability(dataSet);
                //Add to total if prediction match is better than a random guess
                if ((pm - randomPredictionProbability) > 0)
                    dsPM += (pm - randomPredictionProbability);
            }
            //Multiply total by compressibility
            let predComp = Util.getPMCompRatio(predictionString);
            dsPM *= predComp;
            //Sum up prediction match for all datasets
            dsPMTotal += dsPM;
            /* Calculate max CI for this data set considered independently.
                Same calculation as overall CI with data considered by itself.
             */
            //Calculate compressiblity of this data set
            let dsValues = dataSet.tsData.map(val => (val.value));
            let dsEnvComp = Util.getEnvironmentCompRatio(dsValues);
            //Store compressibility for display to user
            this.dataSetCompressibility.push({
                compressibility: dsEnvComp,
                name: dataSet.name
            });
            //Multiply prediction match by data set compressiblity for individual dataset calculation
            dsPM *= dsEnvComp;
            if (DEBUG_COMPLEXITY)
                console.log(dataSet.name + ". Prediction compressibility: " + predComp + " data environment compressibility: " + dsEnvComp + "; pm max for data set: " + dsPM);
            /* Round down to zero or take log2 */
            let dsMaxCI = 0;
            if (dsPM >= 1)
                dsMaxCI = Math.log2(dsPM);
            //Store max CI for this environment
            this.dataSetCIMax.push(dsMaxCI);
            if (DEBUG_CRYSTALLIZED_INTELLIGENCE)
                console.log(`calculateMaxCrystallizedIntelligence: Dataset Max CI: ${dsMaxCI}; Environment compression: ${dsEnvComp}; prediction compression: ${predComp}.`);
        }
        //Next take compression of all environments taken together into account
        this.totalEnvironmentCompressibility = Util.getEnvironmentCompRatio(completeData);
        if (DEBUG_MAX_INTELLIGENCE)
            console.log("Total environment compressibility: " + this.totalEnvironmentCompressibility);
        dsPMTotal *= this.totalEnvironmentCompressibility;
        /* Prediction match Negative intelligence makes no sense here,
            so round to zero or take log2 */
        if (dsPMTotal < 1)
            this.ciMax = 0;
        else
            this.ciMax = Math.log2(dsPMTotal);
        if (DEBUG_MAX_INTELLIGENCE) {
            console.log("------------- Max and Min CI ------------");
            console.log("Total max CI: " + this.ciMax);
            for (let ds = 0; ds < this.data.dataSets.length; ++ds) {
                let dataSet = this.data.dataSets[ds];
                const ranPredProb = this.getRandomPredictionProbability(dataSet);
                console.log(dataSet.name + ". " + dataSet.tsData.length + " items; max data set CI: " + this.dataSetCIMax[ds] + "; random prediction probabiliity: " + ranPredProb);
            }
            console.log("");
        }
        //Let other classes know that compressibility has changed.
        document.dispatchEvent(new CustomEvent('UpdateCompressibility'));
    }
    /** Calculates the match between the mean and variance of a prediction and the
     *  actual value in the time series.
     *  Considered a match if it lies within three standard deviations of the mean (99.7 probability)
     *  */
    getPredictionMatch(value, mean, standardDeviation) {
        if (DEBUG_PROBABILITY)
            console.log("getProbability> value: " + value + "; mean: " + mean + "; standard deviation: " + standardDeviation);
        //Check number of items used to calcluate normal distribution of prediction
        if (this.ml.getNumberOfModels() < TTest.min() || this.ml.getNumberOfModels() > TTest.max())
            throw `This number of models ${this.ml.getNumberOfModels()} is not supported by current implementation of t-test.`;
        //Return 1 if it passes t test
        if (TTest.tTest(value, mean, standardDeviation, this.ml.getNumberOfModels(), this.pValue))
            return 1;
        return 0;
    }
    /**
     * A completely naive system will assign equal probability to all values
     * So probability of a continuous random variable taking a particular value is zero
     * */
    getRandomPredictionProbability(dataSet) {
        return 0;
    }
    /** Calculates the rate of change at each point in the PI history, starting at 0+polynomialWindow and ending at piHistory length - polynomialWindow.
     * At each point a polynomial function is fitted to the points in the window and then the differential is taken to calculate the slope.
     * Polynomial approximation is done using this library for polynomial fit https://github.com/RobertMenke/JS-Polynomial-Regression
     */
    updateFluidIntelligence() {
        //Clear arrays
        this.fiXArray = [];
        this.fiYArray = [];
        //Work through crystalized intelligence array for points within polynomial window
        for (let i = this.polynomialWindow; i < this.ciXArray.length - this.polynomialWindow; ++i) {
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
        if (x - this.polynomialWindow < 0 || x + this.polynomialWindow >= this.ciXArray.length)
            return [];
        //Get historical PI data in a form suitable for the PolynomialRegression library
        let data = this.getPolynomialData(x - this.polynomialWindow, x + this.polynomialWindow);
        //Use Polynomial Regression library to get an approximation to points
        const model = PolynomialRegression.read(data, 3);
        return model.getTerms();
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
        if (xEnd > this.ciXArray.length)
            throw "getPolynomialData. xEnd out of range: " + xEnd;
        const data = [];
        for (let i = xStart; i < xEnd; i++) {
            data.push({
                x: i,
                y: this.ciYArray[i]
            });
        }
        return data;
    }
    /** Clears all data structures */
    reset() {
        this.dataSetCIMax = [];
        this.ciMax = 0;
        this.pmXArray = [];
        this.pmYArray = [];
        this.ciXArray = [];
        this.ciYArray = [];
        this.dsCIXArray = [];
        this.dsCIYArray = [];
        this.fiXArray = [];
        this.fiYArray = [];
    }
    /** Returns x and y values for the crystallized intelligence plot */
    getTotalCrystallizedIntelligencePlot() {
        return [this.ciXArray, this.ciYArray];
    }
    /** Returns x and y values of crystallized intelligence for each data set
     *  considered independently. */
    getDataSetCrystallizedIntelligencePlot() {
        return [this.dsCIXArray, this.dsCIYArray];
    }
    /** Returns x and y values for fluid intelligence plot */
    getFluidIntelligencePlot() {
        return [this.fiXArray, this.fiYArray];
    }
    /** Sets the p value for t-test */
    setPValue(pValue) {
        this.pValue = pValue;
    }
}
