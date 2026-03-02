/**
 * Static class for performance measurement
 */
import * as Stats from './Statistics.js';
export class Timer {
    //Start of an operation in UTC
    static startTime_ms;
    //Only one run timer at a time
    static timerRunning = false;
    //Holds statistics for calculation of mean interval
    static intervalArray = [];
    /** Starts timer */
    static start() {
        if (this.timerRunning)
            throw "Timer cannot be started when it is already running";
        //Record start time
        this.startTime_ms = Date.now();
        //Timer is now running.
        this.timerRunning = true;
    }
    /** End of timed period, returns interval */
    static end(label, storeInterval) {
        if (!this.timerRunning)
            throw "Timer can't be ended if it is not running!";
        //Calculate interval
        const interval = Date.now() - this.startTime_ms;
        //Store interval for statistics
        if (storeInterval)
            this.intervalArray.push(interval);
        console.log(`${label}: Current interval: ${interval} ms. Interval mean: ${this.getIntervalMean()} ms. Interval sample SD: ${this.getIntervalStandardDeviation()}. Number of measurements: ${this.intervalArray.length}.`);
        //End timer
        this.timerRunning = false;
        return interval;
    }
    /** Returns mean interval */
    static getIntervalMean() {
        if (this.intervalArray.length === 0)
            return -1; //No meaningful calculation of interval possible
        //Return the mean
        return Stats.mean(this.intervalArray);
    }
    /** Returns interval standard deviation */
    static getIntervalStandardDeviation() {
        if (this.intervalArray.length === 0)
            return -1; //No meaningful calculation of standard deviation possible
        //Return sample standard deviation
        return Stats.sampleStandardDeviation(this.getIntervalMean(), this.intervalArray);
    }
    /** Clears stored statistics */
    static reset() {
        this.intervalArray = [];
        this.timerRunning = false;
    }
}
