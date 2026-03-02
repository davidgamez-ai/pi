import {SequenceDataItem, DataSet} from "./Types.js";
import {DEBUG_NORMALIZE, DEBUG_DATA} from "./Debug.js";

//Declare type of TensorFlow global variable
declare let tf:any;


/** Machine learning models have to be trained with sequences of input
 *  data followed by the label, which is the next number in the sequence.
 *  For example, for the sequence 123456789, one input sequence might be 456
 *  and the label would be 7.
 *  This class converts time series data into sequence data suitable
 *  for training and querying the models.
 */
export class SequenceData {
    //Array of sequence data items
    items:SequenceDataItem[] = [];

    //Reference to original data set
    dataSet:DataSet;


    constructor(dataSet:DataSet, numSteps:number) {
        //Store reference to data set
        this.dataSet = dataSet;

        //Build the sequence data
        this.buildSequenceData(numSteps);
    }


    /** Converts data to input sequences followed by the number that
     * follows the input sequence in the data
     * @param data
     * @param numSteps
     */
    buildSequenceData(numSteps:number):void {
        //Extract the values and discard timestamp
        const values:number[] = this.dataSet.tsData.map(d => ( d.value ));

        //Split data
        for(let i:number=0; i<values.length; i++){
            if((i + numSteps) < values.length){//Check there is enough data
                this.items.push ({
                    input: values.slice(i, i + numSteps),
                    nextValue: values[i + numSteps]
                });
            }
        }

        //Normalize data
        this.normalize();
    }


    /** In place normalization of split sequence data.
     *  */
    normalize(){
        //Check that data exists - no normalization to be done if array is empty
        if(this.items.length === 0)
            return;

        //Normalize data in place
        for(let val of this.items){
            val.nextValue = (val.nextValue - this.dataSet.min) / (this.dataSet.max-this.dataSet.min);
            for(let i:number=0; i<val.input.length; ++i){
                val.input[i] = (val.input[i] - this.dataSet.min) / (this.dataSet.max-this.dataSet.min);
            }
        }
        if(DEBUG_NORMALIZE) console.log(this.items);
    }


    /** Returns a de-normalized copy of the array */
    deNormalize(arr:number[]):number[]{
        const deNormArr:number[] = arr.map( val => {
            return val * (this.dataSet.max-this.dataSet.min) + this.dataSet.min;
        });
        if(DEBUG_NORMALIZE) console.log(deNormArr);
        return deNormArr;
    }


    /** Builds tensors for training the model */
    getTrainTensors(trainPercent:number):any {
        //Check that the train percent is in range
        if (trainPercent < 0 || trainPercent > 100)
            throw "Train percent is out of range: " + trainPercent;

        //Calculate indexes for split
        let trainLength:number = Math.floor(this.items.length * (trainPercent / 100));
        if (DEBUG_DATA) console.log("Data length: " + this.items.length + "; train length: " + trainLength);

        //Build train, validate and test tensors
        const inputTrain = this.getInputTensor(this.items.slice(0, trainLength));
        const labelTrain = this.getLabelTensor(this.items.slice(0, trainLength));

        //Return
        return [inputTrain, labelTrain];
    }


    /** Builds tensors for validating the model */
    getValidationTensors(trainPercent:number, validationPercent:number):any {
        //Check that the validation percent is in range
        if (validationPercent < 0 || validationPercent > 100)
            throw "Validation percent is out of range: " + validationPercent;

        //Calculate indexes for split
        let trainLength:number = Math.floor(this.items.length * (trainPercent / 100));
        let valLength:number = Math.floor(this.items.length * (validationPercent / 100));
        if (DEBUG_DATA) console.log("Data length: " + this.items.length + "; val length: " + valLength );

        //Build train, validate and test tensors
        const inputVal = this.getInputTensor(this.items.slice(trainLength, trainLength + valLength));
        const labelVal = this.getLabelTensor(this.items.slice(trainLength, trainLength + valLength));

        //Return
        return [inputVal, labelVal];
    }


    /** Builds tensors for testing the model */
    getTestTensors(trainPercent:number, validationPercent:number, testPercent:number):any {
        //Check that the test percent is in range
        if (testPercent < 0 || testPercent > 100)
            throw "Test percent is out of range: " + testPercent;

        //Calculate indexes for split
        let trainLength:number = Math.floor(this.items.length * (trainPercent / 100));
        let valLength:number = Math.floor(this.items.length * (validationPercent / 100));

        //Build train, validate and test tensors
        const inputTest = this.getInputTensor(this.items.slice(trainLength + valLength, this.items.length));
        const labelTest = this.getLabelTensor(this.items.slice(trainLength + valLength, this.items.length));
        if (DEBUG_DATA) console.log("Data length: " + this.items.length + "; train: " + trainLength + "; validation: " + valLength + "; test: " + inputTest.arraySync().length);

        //Return
        return [inputTest, labelTest];
    }


    /** Builds tensors for measuring the model's intelligence
     * Intelligence is measured across all data points, in contrast to standard
     * machine learning.
     * */
    getIntelligenceMeasurementTensors():any {
        //Build tensors containing all data
        const inputIntelMeasure = this.getInputTensor(this.items);
        const labelIntelMeasure= this.getLabelTensor(this.items);
        if (DEBUG_DATA) console.log("Items for intelligence measurement. Data length: " + inputIntelMeasure.arraySync().length);

        //Return
        return [inputIntelMeasure, labelIntelMeasure];
    }


    /** Converts and array of sequence data into an input tensor that works with
     *  TensorFlow.js models.
     * @param seqDataArr
     */
    getInputTensor(seqDataArr:SequenceDataItem[] ){
        //tf.tidy executes the function and cleans up intermediate tensors to prevent memory leaks
        return tf.tidy( () => {
            //Split out the inputs
            const inputs:number[][] = seqDataArr.map( d => (d.input));

            //Convert to tensor
            const inputTensor = tf.tensor2d(inputs, [inputs.length, inputs[0].length]);

            //Reshape input tensor to match what model expects and return
            const inputTensor3D = inputTensor.reshape([inputs.length, inputs[0].length, 1]);
            return inputTensor3D;
        });
    }


    /** Converts and array of sequence data into a label tensor that works with
     *  TensorFlow.js models.
     * @param seqDataArr
     */
    getLabelTensor(seqDataArr:SequenceDataItem[] ){
        //tf.tidy executes the function and cleans up intermediate tensors to prevent memory leaks
        return tf.tidy( () => {
            //Split out the labels
            const labels:number[] = seqDataArr.map( d => (d.nextValue));

            //Convert to tensor and return
            const labelTensor = tf.tensor2d(labels, [labels.length, 1]);
            return labelTensor;
        });
    }

}