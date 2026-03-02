import {TimeSeriesData, DataSet} from './Types.js'
import {DEBUG_NORMALIZE} from "./Debug.js";
import {msftData} from "./data/msft.js";
import {heathrowMaxTempData} from "./data/HeathrowWeather.js";
import {UKCovidData} from "./data/UKCovidData.js";
import {MEASURE_PERFORMANCE} from "../machine-learning/Debug.js";

/** Handles the data for the time series prediction.
 *  All data is stored locally in files so that this
 *  can run in the browser without CORS issues. */
export class Data {
    //Data sets selected by user
    dataSets: DataSet[] = [];

    //Complete set of data sets
    #dataStore: DataSet[] = [];

    //Index of display data set
    dataIndex: number = 0;

    //Raw Data
    linearRaw: TimeSeriesData[] = [];
    sineRaw: TimeSeriesData[] = [];
    noisySineIncreasing: TimeSeriesData[] = [];
    msft: TimeSeriesData[];
    heathrowMaxTemp: TimeSeriesData[];
    ukCovid: TimeSeriesData[];

    constructor() {
        //Load data sets
        this.loadData();

        //Add data sets to data store
        let [min, max]: [number, number] = this.getMinMax(this.linearRaw);
        this.#dataStore.push({
            name: "Line",
            yLabel: "Value",
            tsData: this.linearRaw,
            predictions: [],
            min: min,
            max: max,
            symbol: "triangle-down"
        });

        [min, max] = this.getMinMax(this.sineRaw);
        this.#dataStore.push({
            name: "Sine",
            yLabel: "Value",
            tsData: this.sineRaw,
            predictions: [],
            min: min,
            max: max,
            symbol: "triangle-up"
        });

        [min, max] = this.getMinMax(this.noisySineIncreasing);
        this.#dataStore.push({
            name: "Sine increasing baseline with noise",
            yLabel: "Value",
            tsData: this.noisySineIncreasing,
            predictions: [],
            min: min,
            max: max,
            symbol: "star"
        });

        [min, max] = this.getMinMax(this.msft);
        this.#dataStore.push({
            name: "Microsoft Stock",
            yLabel: "Price",
            tsData: this.msft,
            predictions: [],
            min: min,
            max: max,
            symbol: "square"
        });

        [min, max] = this.getMinMax(this.heathrowMaxTemp);
        this.#dataStore.push({
            name: "Daily Temperature Heathrow",
            yLabel: "Max Daily Temp (Celcius)",
            tsData: this.heathrowMaxTemp,
            predictions: [],
            min: min,
            max: max,
            symbol: "diamond"
        });

        [min, max] = this.getMinMax(this.ukCovid);
        this.#dataStore.push({
            name: "UK Coronavirus Deaths",
            yLabel: "Daily Deaths",
            tsData: this.ukCovid,
            predictions: [],
            min: min,
            max: max,
            symbol: "x"
        });

        //Copy all data sets into data set
        for (let ds of this.#dataStore)
            this.dataSets.push(ds);

        //Output stats about data 
        if(MEASURE_PERFORMANCE) this.printStatistics();
    }

    printStatistics():void{
        //Output statistics about data
        console.log("------------- Data Statistics ----------------");
        let dataPointCnt:number = 0;
        for(let ds of this.dataSets){
            console.log(` - Data set: "${ds.name}". Number of points: ${ds.tsData.length}.`)
            dataPointCnt += ds.tsData.length;
        }
        console.log(`Total number of data points: ${dataPointCnt}.`);
    }

    /** Returns all data sets */
    getDataStore(): DataSet[] {
        return this.#dataStore;
    }

    /** Builds or loads data sets */
    loadData() {
        //Generate synthetic data
        this.generateLinearData();
        this.generateSineData();
        this.generateNoisySineIncreasingData();

        //Load stored data
        this.loadMSFTData();
        this.loadHeathrowWeatherData();
        this.loadUKCovidData();
    }

    /** Returns minimum and maximum values in the data set */
    getMinMax(data: TimeSeriesData[]): [number, number] {
        let min: number = 0, max: number = 0;
        for (let item of data) {
            if (item.value < min)
                min = item.value;
            if (item.value > max)
                max = item.value;
        }
        if (DEBUG_NORMALIZE) console.log("Min: " + min + "; max: " + max);
        return [min, max];
    }

    /** Builds a data set with linear data */
    generateLinearData(): void {
        //Simple linear sequence
        let val: number = 0;
        for (let i: number = 0; i < 1000; i++) {
            this.linearRaw.push({timeStamp: i, value: val});
            val += 2;
        }
    }

    /** Builds a data set with sinusoidal data */
    generateSineData(): void {
        //Simple sinusoidal sequence
        for (let i: number = 0; i < 100; i += 0.2) {
            this.sineRaw.push({timeStamp: i, value: Math.sin(i)});
        }
    }

    /** Builds a data set that has a sinusoidal signal with increasing noise
     *  and an increasing baseline */
    generateNoisySineIncreasingData() {
        //How rapidly the sine changes over time.
        const radiansPerHour: number = (2 * Math.PI) / 24;

        // Amount of noise to add to signal in percent
        const noise: number = 0.1;

        //Base level of the data - randomly varies between 10 and 300
        const baseLevel: number = 10;

        //Amount by which the base level increases over time.
        const baseLevelIncrement: number = 0.005 * baseLevel;

        //Percent by which sine changes base level
        const sinePercent: number = 0.2;

        //Number of hours
        const numHours: number = 500;

        //Generate data
        for (let hour: number = 0; hour < numHours; ++hour) {
            //Create new value, starting at the base level
            let newVal: number = baseLevel;

            //Add sine
            newVal += sinePercent * baseLevel * Math.sin(hour * radiansPerHour);

            //Increase value over time
            newVal += baseLevelIncrement * hour;

            //Add noise
            newVal += newVal * noise * (Math.random() - 0.5);

            this.noisySineIncreasing.push({
                timeStamp: hour,
                value: newVal
            })
        }
    }

    /** Loads Microsoft stock data from file */
    loadMSFTData() {
        //Load and sort data
        this.msft = JSON.parse(msftData);
        this.sort(this.msft);
    }

    /** Loads maximum daily temperature (Celcius) for Heathrow, UK, from file */
    loadHeathrowWeatherData() {
        //Load and sort data
        this.heathrowMaxTemp = JSON.parse(heathrowMaxTempData);
        //console.log(this.heathrowMaxTemp);
        this.sort(this.heathrowMaxTemp);
    }

    /** Loads daily deaths from Covid in the UK from file */
    loadUKCovidData() {
        this.ukCovid = JSON.parse(UKCovidData);
        this.sort(this.ukCovid);
    }

    /** Sorts data with time stamp increasing */
    sort(tsData: TimeSeriesData[]) {
        //Sort using time stamp
        tsData.sort((d1, d2) => {
            if (d1.timeStamp < d2.timeStamp) {
                return -1;
            }
            if (d1.timeStamp > d2.timeStamp) {
                return 1;
            }
            // a must be equal to b
            return 0;
        });
    }
}