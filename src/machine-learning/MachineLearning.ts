//Model based on https://machinelearningmastery.com/how-to-develop-lstm-models-for-time-series-forecasting/

import {BatchLog, EpochLog, Prediction, TimeSeriesData} from "./Types.js";
import {SequenceData} from "./SequenceData.js";
import {DEBUG_DATA, DEBUG_MACHINE_LEARNING, DEBUG_PREDICT, DEBUG_TRAINING, MEASURE_PERFORMANCE} from "./Debug.js";
import {Plotter} from "./Plotter.js";
import {Logger} from "./Logger.js";
import {Data} from "./Data.js";
import {IntelligenceEngine} from "./IntelligenceEngine.js";
import * as Stats from '../common/Statistics.js';

//Declare type of TensorFlow global variable
declare let tf:any;


/** Handles machine learning task for application.
 *  Builds deep networks and uses them to make predictions about
 *  time series data. The final prediction is the mean and variance
 *  of the predictions of the separate models.
 */
export class MachineLearning {
    //Needs access to plotter for graphs
    plotter:Plotter;

    //Class holding time series data sets
    data:Data;

    //Class for intelligence calculations
    iEngine:IntelligenceEngine;

    //Split between training, validation and test
    trainPercent:number;
    validationPercent:number;
    testPercent:number;

    //Size of batch fed into model
    batchSize:number;

    //Number of epochs to optimize model
    epochs:number;

    //Number of training cycles
    trainingCycles:number;

    //Enables training to be stopped part way through
    //Does not halt train of individual models, but prevents further models being trained
    //and further training cycles
    stopTraining:boolean = false;

    //Number of steps in time window
    private timeWindow:number;
    
    //Number of LSTM units
    private lstmUnits:number;

    //Number of models - multiple models are used to generate a spread of results
    private numberOfModels:number;

    //Array holding TensorFlow Machine learning models
    private modelArray:any[];

    //Data set split into sequences for training etc.
    // One sequence data class per data set.
    sequenceDataArray:SequenceData[] = [];


    /** Builds models for the machine learning */
    buildModels():void {
        Logger.info("Building models");

        //Clear or initialize array
        this.modelArray = [];
        let numFeatures:number = 1;

        //Create models
        for(let m:number=0; m< this.numberOfModels; ++m){
            let model = tf.sequential();

            //Add the LSTM layer
            //See: https://js.tensorflow.org/api/3.7.0/#layers.lstm
            model.add(tf.layers.lstm({
                activation: 'relu',
                inputShape: [this.timeWindow, numFeatures],
                units: this.lstmUnits
            }));

            //Add the dense layer for output
            model.add(tf.layers.dense({
                units: 1
                //,            inputShape: [input_layer_shape]
            }));

            model.compile({
                optimizer: tf.train.adam(),
                loss: 'meanSquaredError'
            });

            //Store model
            this.modelArray.push(model);
        }
        if(MEASURE_PERFORMANCE) console.log(`Tensor Flow backend: ${tf.getBackend()}.`);
    }


    /** Time window controls how many previous steps will be used
     *  to feed into the model.
     * @param tw
     */
    setTimeWindow(tw:number){
        if(tw === this.timeWindow)
            return;//Ignore if there is no change.

        //Store time window
        this.timeWindow = tw;
    }


    getTimeWindow():number{
        return this.timeWindow;
    }


    /** Sets the number of LSTM units in each model. */
    setLSTMUnits(lstmUnits:number){
        if(lstmUnits === this.lstmUnits)//No change
            return;

        //Store value
        this.lstmUnits = lstmUnits;
    }


    /** Sets the number of models.
     *  Several models are used to calculate mean and sd for predictions.
     * @param numModels
     */
    setNumberOfModels(numModels:number){
        if(numModels === this.numberOfModels)//No change
            return;

        //Store value
        this.numberOfModels = numModels;
    }


    /** Converts time series data into sequence data suitable
     *  for training models
     */
    buildSequenceData(){
        //Generate the sequence data.
        // This needs to be done whenever the time step changes or whenever the current data changes.
        this.sequenceDataArray = [];
        for(let ds of this.data.dataSets){
            this.sequenceDataArray.push(new SequenceData(ds, this.timeWindow));
        }
    }


    /** Trains models on current data set */
    async train(){
        Logger.info("Training started.");

        if(this.modelArray.length === 0)
            throw "Models not built";
        if(this.sequenceDataArray.length === 0)
            throw "Sequence data not built";

        //Get input and label tensors for training, validation and testing from currently selected data set
        const [inputTrain, labelTrain] = this.sequenceDataArray[this.data.dataIndex].getTrainTensors(this.trainPercent);
        const [inputVal, labelVal] = this.sequenceDataArray[this.data.dataIndex].getValidationTensors(this.trainPercent, this.validationPercent);

        //Keep track of number of epochs during training
        let epochCounter:number = 0;

        //Reset epoch data
        this.plotter.resetEpochData();
        this.plotter.resetBatchData();

        //Work through the models
        for (let model: number = 0; model < this.modelArray.length && !this.stopTraining; ++model) {
            Logger.info("Training model " + (model+1) );

            /* Fit model to data */
            await this.modelArray[model].fit(inputTrain, labelTrain, {
                batchSize: this.batchSize,
                validationData: [inputVal, labelVal],
                epochs: this.epochs,
                shuffle: false,
                callbacks: {
                    onEpochBegin: (epoch: number, log: EpochLog) => {
                        //Clear batch data
                        this.plotter.newEpoch();
                    },
                    onEpochEnd: (epoch: number, log: EpochLog) => {
                        if (DEBUG_TRAINING) console.log("On epoch end: " + epoch + " epoch counter: " + epochCounter);
                        epochCounter = epoch + 1;
                        this.plotter.addEpochLoss(model, epoch, log.loss, log.val_loss);
                        this.plotter.plotEpochLoss();
                    },
                    onBatchEnd: (batch: number, log: BatchLog) => {
                        if (DEBUG_TRAINING) console.log("On batch end: " + (batch + epochCounter * 10));
                        this.plotter.addBatchLoss(model, batch, log.loss);
                        this.plotter.plotBatchLossGraph(model);
                    }
                }
            });
        }

        //Get predictions after training
        this.predict();
    }


    /** Generates predictions for all the data sets */
    predict(){
        Logger.info("Generating predictions");

        //Run some checks
        if(this.modelArray.length === 0)
            throw "Models not built";
        if(this.sequenceDataArray.length === 0)
            throw "Sequence data not built";

        //Work through all data sets
        for (let i: number = 0; i < this.sequenceDataArray.length; ++i) {
            //Get tensors
            const [inputIntelMeas, labelIntelMeas] = this.sequenceDataArray[i].getIntelligenceMeasurementTensors();
            if (DEBUG_PREDICT) console.log("--------------- Prediction Input ----------------");
            if (DEBUG_PREDICT) inputIntelMeas.print();

            //Arrays to hold the predictions for each model
            const predictionArray:number[][] = [];

            //Work through the models
            for(let m:number=0; m<this.modelArray.length; ++m) {
                Logger.info("Model " + (m+1) + " predicting. Data set: " + i);

                //Generate predictions from model
                const predictions = this.modelArray[m].predict(inputIntelMeas);
                if (DEBUG_MACHINE_LEARNING) predictions.print();

                //Convert predictions to array. This is a 2D array with one data item in each array: [[1],[2], ...]
                const predArr2D: number[][] = predictions.arraySync();

                //Convert to 1D array and de-normalize.
                const predArr1D: number[] = this.sequenceDataArray[i].deNormalize(predArr2D.map(d => (d[0])));

                //Store predictions for this model
                predictionArray.push(predArr1D);
            }
            if(predictionArray.length === 0)
                throw "Predictions not made or stored.";

            //Calculate mean and standard deviation of the models' predictions
            let total:number = 0;
            let finalPredArr:Prediction[] = [];
            for(let p:number=0; p<predictionArray[0].length; ++p){//Work through predictions
                const predictionValuesArray:number[] = [];
                for(let m:number=0; m<predictionArray.length; ++m){//Work through predictions for each model
                    total+= predictionArray[m][p];
                    predictionValuesArray.push(predictionArray[m][p]);
                }

                //Calculate mean and SD
                const mean:number = Stats.mean(predictionValuesArray);
                const variance:number = Stats.sampleStandardDeviation(mean, predictionValuesArray);

                //Store prediction
                finalPredArr.push({
                    mean: mean,
                    standardDeviation: variance,
                    timeStamp: -1 //Temporary timestamp value
                });
            }

            /* Get part of raw data set covered by predictions
                Subtract time window from data because first three points are not predicted.
            */
            let tmpTimeSeries: TimeSeriesData[] = this.data.dataSets[i].tsData.slice(this.timeWindow, this.data.dataSets[i].tsData.length);
            if (DEBUG_DATA) console.log(`Length of prediction array: ${finalPredArr.length}; length of raw data corresponding to predictions: ${tmpTimeSeries
                .length}; time window: ${this.timeWindow}`);

            //This time series should be the same length as predictions
            if (tmpTimeSeries.length !== finalPredArr.length)
                throw "Predictions do not match length of test data. Predictions length: " + finalPredArr.length + "; test data lenght: " + tmpTimeSeries.length;

            //Add timestamps to predictions array
            this.data.dataSets[i].predictions = [];
            for (let j = 0; j < tmpTimeSeries.length; ++j) {
                this.data.dataSets[i].predictions.push({
                    timeStamp: tmpTimeSeries[j].timeStamp,
                    mean: finalPredArr[j].mean,
                    standardDeviation: finalPredArr[j].standardDeviation
                });
            }
        }
        Logger.info("Predictions complete");

        //Instruct intelligence engine to recalculate intelligence
        this.iEngine.update();

        //Plot data and predictions
        this.plotter.replot();
    }


    /**
     * Returns the number of models
     */
    getNumberOfModels():number {
        return this.numberOfModels;
    }

}