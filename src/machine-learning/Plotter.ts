import {DataSet, PlotlyEvent, Prediction, TimeSeriesData} from "./Types.js";
import * as Util from './Util.js';
import {
    BATCH_LOSS_GRAPH_DIV,
    EPOCH_LOSS_GRAPH_DIV,
    DATA_GRAPH_DIV,
    PREDICTION_MATCH_GRAPH_DIV,
    CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV,
    FLUID_INTELLIGENCE_GRAPH_DIV,
    PREDICTION_PROBABILITY_GRAPH_DIV
} from "./Constants.js";
import {
    DEBUG_DATA_GRAPH,
    DEBUG_EVENTS,
    DEBUG_FLUID_INTELLIGENCE,
    DEBUG_INTELLIGENCE_GRAPHS,
    DEBUG_TRAINING_GRAPHS
} from "./Debug.js";
import {MachineLearning} from "./MachineLearning.js";
import {Data} from "./Data.js";
import {IntelligenceEngine} from "./IntelligenceEngine.js";
import {MachineLearningMain} from "./MachineLearningMain.js";
import * as Colors from '../common/Colors.js';

//Declare type of Plotly global variable
declare let Plotly:any;


/** Plots graphs for application */
export class Plotter {
    //Reference to machine learning class
    ml:MachineLearning

    //Reference to intelligence engine
    iEngine:IntelligenceEngine;

    //Class holding data sets and predictions
    private data:Data;

    //Reference to main so we can tell if built or not
    main:MachineLearningMain;

    //Holds colours to draw each data set.
    dataSetColors:string[] = [];

    //Point in crystallized intelligence graph that has been clicked on
    ciClickX:number = -1;

    //Index in original data set corresponding to point that user has clicked on
    dataClickIndex:number = -1;

    //Increased each time a graph is plotted so that plotly knows to replot using react.
    plotCount:number = 0;

    //Array of polynomial terms for point that has been clicked on.
    polynomialTerms:Array<number> = [];

    /** Batch data for training plots. Plotted fresh for each epoch
     * This points to an array of X values and loss values for the current epoch
     * */
    batchX:number[] = [];
    batchLoss:number[] = [];

    /** Epoch data for training plots. Plot epoch data for each model during training cycle
     */
    epochValLoss:number[][] = [];//Each model has its own set of values for the epochs
    epochLoss:number[][] = [];//Each model has its own set of values for the epochs
    epochLossTraceColors:string[] = [];//Separate trace colour for each model
    epochValLossTraceColors:string[] = [];//Separate trace colour for each model

    //Plots individual traces for each data set
    plotIndividualDatasets:boolean = true;

    //How many standard deviations to plot
    sigmaPlot:number = 3;

    //Toggle plotting of batch loss
    plotBatchLoss:boolean = true;


    /** Plots / replots all graphs */
    replot(){
        this.plotData();
        this.plotPredictionMatch();
        this.plotPredictionDistribution();
        this.plotCrystallizedIntelligence();
        this.plotFluidIntelligence();
    }


    /** Plots the current data set */
    plotData():void {
        if (DEBUG_DATA_GRAPH) console.log("Plotting data");
        this.show(DATA_GRAPH_DIV);

        //Reference to current data set
        const dataSet: DataSet = this.data.dataSets[this.data.dataIndex];

        //Get x and y arrays of raw data
        const xArray = dataSet.tsData.map(d => (d.timeStamp));
        const yArray = dataSet.tsData.map(d => (d.value));

        //Get x and y arrays of prediction data
        const pXArray = dataSet.predictions.map(d => (d.timeStamp));
        const pMeanArray = dataSet.predictions.map(d => (d.mean));
        const pPlusSDArray = dataSet.predictions.map(d => (d.mean + this.sigmaPlot * d.standardDeviation));
        const pMinusSDArray = dataSet.predictions.map(d => (d.mean - this.sigmaPlot * d.standardDeviation));

        //Calculate lengths of the train, validate and test components
        const [trainLength, valLength, testLength] = Util.getDataSplitLengths(dataSet, this.ml.trainPercent, this.ml.validationPercent);

        //Build traces
        const traceArray: any[] = [];

        //Training data
        traceArray.push({
            x: xArray.slice(0, trainLength),
            y: yArray.slice(0, trainLength),
            mode: 'lines',
            name: 'Training',
            line: {
                color: 'rgb(19,19,141)',
                width: 2
            }
        });

        //Validation data
        traceArray.push({
            x: xArray.slice(trainLength, trainLength + valLength),
            y: yArray.slice(trainLength, trainLength + valLength),
            mode: 'lines',
            name: 'Validation',
            line: {
                color: 'rgb(21,172,177)',
                width: 2
            }
        });

        //Test data
        traceArray.push({
            x: xArray.slice(trainLength + valLength, xArray.length),
            y: yArray.slice(trainLength + valLength, xArray.length),
            mode: 'lines',
            name: 'Test',
            line: {
                color: 'rgb(138,236,20)',
                width: 2
            }
        });

        //Only display predictions etc. when network and data structures have been built.
        if(this.main.built){
            //Prediction data mean
            traceArray.push({
                x: pXArray,
                y: pMeanArray,
                mode: 'lines',
                name: 'Prediction mean',
                line: {
                    color: 'rgb(255,0,0)',
                    width: 2
                }
            });

            //Prediction data mean + 2 standard deviations
            traceArray.push({
                x: pXArray,
                y: pPlusSDArray,
                mode: 'lines',
                name: `Prediction + ${this.sigmaPlot} SD`,
                line: {
                    color: 'rgb(255,102,0)',
                    width: 2
                }
            });

            //Prediction data mean - 2 standard deviations
            traceArray.push({
                x: pXArray,
                y: pMinusSDArray,
                mode: 'lines',
                name: `Prediction - ${this.sigmaPlot} SD`,
                line: {
                    color: 'rgb(255,0,161)',
                    width: 2
                }
            });

            //Highlight the point that has been clicked on.
            if (this.dataClickIndex > 0) {
                let clickTrace = {
                    x: [xArray[this.dataClickIndex]],
                    y: [yArray[this.dataClickIndex]],
                    mode: 'markers',
                    marker: {
                        color: 'rgb(255, 0, 0)',
                        size: 10
                    },
                    name: 'Selected ' + this.dataClickIndex
                }
                traceArray.push(clickTrace);
            }
        }

        //Layout
        let layout = {
            title: dataSet.name,
            xaxis: {
                title: 'Time',
            },
            yaxis: {
                title: dataSet.yLabel
            }
        };

        //Plot graph
        Plotly.react(DATA_GRAPH_DIV, traceArray, layout);
    }


    /** Plots match between predictions and corresponding values in the time series */
    plotPredictionMatch(){
        //Only plot this if model and data are built
        if(!this.main.built)
            return;

        //Show graph
        this.show(PREDICTION_MATCH_GRAPH_DIV);

        let traceArray = [];
        traceArray.push({
            x: this.iEngine.pmXArray[this.data.dataIndex],
            y: this.iEngine.pmYArray[this.data.dataIndex],
            mode: 'lines',
            name: this.data.dataSets[this.data.dataIndex].name,
            line: {
                color: this.dataSetColors[this.data.dataIndex],
                width: 2
            }
        });

        //Add point if data graph has been clicked
        if(this.dataClickIndex !== -1){
            let xTS:number = this.data.dataSets[this.data.dataIndex].tsData[this.dataClickIndex].timeStamp;
            let yVal:number = 0;
            //Find corresponding prediction match - not efficient, but does the job
            let yValFound:boolean = false;
            for(let i:number=0; i<this.iEngine.pmXArray[this.data.dataIndex].length; ++i){
                if(xTS === this.iEngine.pmXArray[this.data.dataIndex][i]) {
                    yVal = this.iEngine.pmYArray[this.data.dataIndex][i];
                    yValFound = true;
                    break;
                }
            }
            if(!yValFound)
                throw "Cannot find y value for time stamp " + xTS;

            traceArray.push( {
                x: [ xTS ],
                y: [ yVal ],
                mode: 'markers',
                marker: {
                    color: 'rgb(255, 0, 0)',
                    size: 10
                },
                name: 'Selected'
            });
        }

        //Layout
        let layout = {
            title: "Prediction Match",
            xaxis: {
                title: 'Time',
            },
            yaxis: {
                title: 'Prediction Match'
            }
        };

        //Plot graph
        Plotly.react(PREDICTION_MATCH_GRAPH_DIV, traceArray, layout);
    }


    /** When user clicks on a point in the prediction match graph
     *  this displays how the match was calculated from the overlap
     *  of probability distributions. */
    plotPredictionDistribution(){
        //Do nothing if not built or if user has not clicked on data graph
        if(this.dataClickIndex === -1 || ! this.main.built){
            return;
        }

        //Show graph
        this.show(PREDICTION_PROBABILITY_GRAPH_DIV)

        //Reference to current data set for convenience
        const dataSet:DataSet = this.data.dataSets[this.data.dataIndex];

        //Get timestamp associated with the x index
        const clickTS:number = dataSet.tsData[this.dataClickIndex].timeStamp;

        //Get prediction for this timestamp
        let pFound:boolean = false, pMean=0, pVariance = 0;
        for(let pred of dataSet.predictions){
            if(pred.timeStamp === clickTS){
                pFound = true;
                pMean = pred.mean;
                pVariance = pred.standardDeviation;
            }
        }
        if(!pFound){
            console.error("Cannot find y value for time stamp " + clickTS);
            throw "Could not find prediction for time stamp " + clickTS;
        }

        //Get actual value for this time stamp and the high and low values used for the match
        let vFound:boolean = false, vValue=0;
        for(let data of dataSet.tsData){
            if(data.timeStamp === clickTS){
                vFound = true;
                vValue = data.value;
            }
        }
        if(!vFound)
            throw "Could not find actual value for time stamp " + clickTS;

        //Get data sets for plots
        const [pXArray, pYArray] = this.getNormalData(pMean, pVariance, this.sigmaPlot);

        //Get max and min x
        let maxX:number = Util.getMax(pXArray);
        let minX:number = Util.getMin(pXArray);

        //Build random plot
        const randomPredictionProbability = this.iEngine.getRandomPredictionProbability(dataSet);
        const rXArray:number[] = [minX, minX, maxX, maxX];
        const rYArray:number[] = [0, randomPredictionProbability, randomPredictionProbability, 0]

        //Generate data set for actual value plot
        let actualX:number[] = [vValue];
        let actualY:number[] = [0];

        //Plot prediction normal distribution
        const traceArray = [];
        traceArray.push({
            x: pXArray,
            y: pYArray,
            mode: 'lines',
            name: "Prediction",
            line: {
                color: 'rgb(255,0,0)',
                width: 2
            },
            fill: 'tozeroy'
        });

        //Plot random guess
        traceArray.push({
            x: rXArray,
            y: rYArray,
            mode: 'lines',
            name: 'Random Guess',
            line: {
                color: 'rgb(205,87,185)',
                width: 2
            },
            fill: 'tonexty'
        });

        //Plot actual value with ranges
        traceArray.push({
            x: actualX,
            y: actualY,
            mode: 'markers',
            name: 'Actual value',
            marker: {
                color: 'rgb(255, 0, 0)',
                size: 10
            },
            //fill: 'tonexty'
        });

        //Layout
        let layout = {
            title: "Prediction Match Calculation for Selected Point",
            xaxis: {
                title: 'Value',
            },
            yaxis: {
                title: ''
            }
        };

        //Plot graph
        Plotly.react(PREDICTION_PROBABILITY_GRAPH_DIV, traceArray, layout);
    }


    /** Returns X and Y arrays corresponding to a normal distributions with
     *  the specified mean and variance
     * @param mean
     * @param variance
     * @param numSD
     */
    getNormalData(mean:number, variance:number, numSD:number):[number[], number[]]{
        let xArray:number[] = [], yArray:number[] = [];
        for(let x:number=mean-numSD*variance; x<=mean+numSD*variance; x+= variance/10){
            xArray.push(x);
            yArray.push( Util.normalDistribution(x, mean, variance));
        }

        return [xArray, yArray];
    }


    /** Plots batch loss
     *  New graph for each epoch
     * */
    plotBatchLossGraph(model:number){
        //Do nothing if plot batch loss is disabled, usually for speed
        if(!this.plotBatchLoss)
            return;

        if(DEBUG_TRAINING_GRAPHS) console.log(this.batchLoss);

        // //Check that the batch loss and batch x have same number of epochs
        if(this.batchLoss.length !== this.batchX.length)
            throw "Batch x and batch loss lengths do not match.";

        //Add batch data to trace array
        let traceArray = [];
        traceArray.push({
            x: this.batchX,
            y: this.batchLoss,
            mode: 'lines',
            name: `Model ${model} Batch Loss`,
            line: {
                color: "rgb(0,0,0)"
            },
        });

        let layout = {
            title: `Model ${model} Batch Loss`,
            xaxis: {
                title: 'Batch'
            },
            yaxis: {
                title: 'Loss'
            },
            showlegend: false
        };
        let config = {responsive: true};
        Plotly.newPlot(BATCH_LOSS_GRAPH_DIV, traceArray, layout, config);
    }


    /** Plots epoch loss
     * Plotted for all models during a training cycle
     * */
    plotEpochLoss(){
        if(DEBUG_TRAINING_GRAPHS) console.log(this.epochValLoss);
        if(DEBUG_TRAINING_GRAPHS) console.log(this.epochLoss);

        //Run some checks
        if(this.epochValLoss.length === 0 || this.epochLoss.length === 0)
            throw "Epoch data has no models - cannot plot empty graphs";
        if(this.epochValLoss[0].length === 0 || this.epochLoss[0].length === 0)
            throw "Epoch data has no data for the models - cannot plot empty graphs";
        if(this.epochValLoss.length !== this.epochLoss.length)
            throw "Epoch loss has different length from epoch value loss";

        //Build x array
        let xArr:number[] = [];
        for(let epoch:number=0; epoch<this.epochLoss[0].length; ++epoch)
            xArr.push(epoch);

        let traceArray = [];
        for(let model:number=0; model<this.ml.getNumberOfModels(); ++model) {
            //Add loss
            traceArray.push({
                x: xArr,
                y: this.epochLoss[model],
                mode: 'lines+markers',
                name: "Model " + model + " Loss",
                line: {
                    color: this.epochLossTraceColors[model]
                },
            });

            //Add validation loss
            traceArray.push({
                x: xArr,
                y: this.epochValLoss[model],
                mode: 'lines+markers',
                name: "Model " + model + " Validation Loss",
                line: {
                    color: this.epochValLossTraceColors[model]
                },
            });
        }

        let layout = {
            title: "Epoch Loss",
            xaxis: {
                title: 'Epoch'
            },
            yaxis: {
                title: 'Loss'
            }
        };
        let config = {responsive: true};
        Plotly.newPlot(EPOCH_LOSS_GRAPH_DIV, traceArray, layout, config);
    }


    /** Resets batch and epoch data for another training session */
    resetTrainingData(){
        this.resetBatchData();
        this.resetEpochData();
    }


    /** Add new array to store batch data for this epoch*/
    newEpoch(){
        this.resetBatchData();
    }


    addBatchLoss(model:number, batch:number, loss:number){
        this.batchX.push(batch);
        this.batchLoss.push(loss);
    }


    addEpochLoss(model:number, epoch:number, loss:number, valLoss:number){
        this.epochLoss[model].push(loss);
        this.epochValLoss[model].push(valLoss);
    }


    /** Resets batch data for another training session */
    resetBatchData(){
        //Clear arrays
        this.batchX = [];
        this.batchLoss = [];
    }


    /** Resets epoch data for another training session */
    resetEpochData(){
        this.epochLoss.length = 0;
        this.epochValLoss.length = 0;
        this.epochLossTraceColors.length = 0;
        this.epochValLossTraceColors.length = 0;

        //Add arrays to store epoch data for each model
        for(let model:number = 0; model<this.ml.getNumberOfModels(); ++model){
            this.epochLoss.push([]);
            this.epochValLoss.push([]);
            this.epochLossTraceColors.push(Colors.getRandomColor());
            this.epochValLossTraceColors.push(Colors.getRandomColor());
        }
    }


    /** Plots the total crystallized intelligence and the crystallized
     *  intelligence for each data set considered independently.
     *  */
    plotCrystallizedIntelligence() {
        if(DEBUG_INTELLIGENCE_GRAPHS) console.log("Plotting crystallized intelligence.");
        this.show(CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV);

        //Get arrays for crystallized intelligence plot summed across all data sets
        let [xArr, yArr]:[number[], number[]] = this.iEngine.getTotalCrystallizedIntelligencePlot();

        //Get arrays for crystallized intelligence plot calculated independently for each data set.
        let [dsXArr, dsYArr]:[number[][], number[][]] = this.iEngine.getDataSetCrystallizedIntelligencePlot();

        //Build traces
        let traceArray:any[] = [];

        //Add trace for total crystallized intelligence
        traceArray.push({
            x: xArr,
            y: yArr,
            mode: 'lines+markers',
            name: "Total (max: " + Util.round(this.iEngine.ciMax, 2) + ")",
            line: {
                color: 'rgb(0,0,255)',
                width: 3
            },
            marker: {
                size: 10
            },
            showlegend: true
        });

        //Add traces for each data set
        //Marker symbols documented here: https://plotly.com/javascript/reference/#box-marker-symbol
        if(this.plotIndividualDatasets) {
            for (let ds: number = 0; ds < this.data.dataSets.length; ++ds) {
                traceArray.push({
                    x: dsXArr[ds],
                    y: dsYArr[ds],
                    mode: 'lines+markers',
                    name: this.data.dataSets[ds].name + " (max: " + Util.round(this.iEngine.dataSetCIMax[ds], 2) + ")",
                    line: {
                        color: this.dataSetColors[ds],
                        width: 1
                    },
                    marker: {
                        symbol: this.data.dataSets[ds].symbol,
                        size: 10
                    },
                    showlegend: true
                });
            }
        }

        //Highlight the point that has been clicked on.
        if(this.ciClickX > 0) {
            let clickTrace = {
                x: [ this.ciClickX ],
                y: [ yArr[this.ciClickX] ],
                mode: 'markers',
                marker: {
                    color: 'rgb(255, 0, 0)',
                    size: 10
                },
                name: 'Selected'
            }
            traceArray.push(clickTrace);
        }

        //Plot the polynomial approximation to the points surrounding the clicked point
        if(this.polynomialTerms.length > 0 && this.ciClickX > 0){
            //Start and end points of the polynomial window surrounding the click point
            let xStart:number = this.ciClickX - this.iEngine.polynomialWindow;
            let xEnd:number = this.ciClickX + this.iEngine.polynomialWindow;
            let xPolyArray:Array<number> = [], yPolyArray:Array<number> = [];

            //Calculate the polynomial approximation to the graph
            for(let x:number=xStart; x<xEnd; ++x){
                xPolyArray.push(x);

                //Calculate y using polynomial terms
                yPolyArray.push(this.iEngine.calculatePolynomialResult(this.polynomialTerms, x));
            }

            //Polynomial trace
            let polynomialTrace = {
                x: xPolyArray,
                y: yPolyArray,
                mode: 'lines',
                name: 'Polynomial approximation',
                line: {
                    color: 'rgb(255,0,0)',
                    width: 2
                }
            };
            traceArray.push(polynomialTrace);

            let slope:number = this.iEngine.getSlope(this.polynomialTerms, this.ciClickX);

            //Calculate slope using c = y-mx
            let yIntersect:number = this.iEngine.calculatePolynomialResult(this.polynomialTerms, this.ciClickX) - slope*this.ciClickX;

            //Draw line from start to end of polynomial window to show slope
            let slopeTrace = {
                x: [xStart, xEnd],
                y: [slope*xStart + yIntersect, slope*xEnd + yIntersect],
                mode: 'lines',
                name: 'Slope of polynomial at selected point',
                line: {
                    color: 'rgb(0, 255, 0)',
                    width: 2
                }
            };
            traceArray.push(slopeTrace);
        }

        //Build layout
        let layout = {
            autosize: true,
            title:'Predictive Intelligence',
            xaxis: {
                title: 'Time',
               // tick0: 0,
                tickmode: "auto",
                tickfont: {
                    size: 13,
                },
                titlefont: {
                    size: 15,
                },
                tickwidth: 2,
                ticklen: 10,
                linewidth: 1.5
            },
            yaxis: {
                title: 'Predictive Intelligence',
                tickfont: {
                    size: 13,
                },
                titlefont: {
                    size: 15,
                },
                tickwidth: 2,
                ticklen: 10,
                linewidth: 1.5
            },
            datarevision: this.plotCount
        };

        //Increase plotcount so that Plotly.react will work
        ++this.plotCount;

        //Plot graph
        let config = {responsive: true};
        Plotly.react(CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV, traceArray, layout, config);
        if(DEBUG_INTELLIGENCE_GRAPHS) console.log("Crystallized intelligence plotting complete. Plot count: " + this.plotCount);
    }


    /** Plots the fluid intelligence */
    plotFluidIntelligence(){
        if(DEBUG_INTELLIGENCE_GRAPHS) console.log("Plotting intelligence rate of change.");
        this.show(FLUID_INTELLIGENCE_GRAPH_DIV);

        let mainTrace = {
            x: this.iEngine.fiXArray,
            y: this.iEngine.fiYArray,
            mode: 'lines+markers',
            name: 'Intelligence Rate of Change',
            line: {
                color: 'rgb(0, 0, 0)',
                width: 3
            },
            marker: {
                color: 'rgb(0, 0, 0)',
                size: 10
            }
        };
        let traceArray = [ mainTrace ];

        //Highlight the point that has been clicked on.
        if(this.ciClickX  !== -1 && this.polynomialTerms.length > 0) {
            let clickTrace = {
                x: [ this.ciClickX ],
                y: [ this.iEngine.fiYArray[this.ciClickX - this.iEngine.polynomialWindow] ],
                mode: 'markers',
                marker: {
                    color: 'rgb(255, 0, 0)',
                    size: 10
                },
                line: {
                    color: 'rgb(0, 0, 0)',
                    width: 2
                },
                name: 'Selected'
            };
            traceArray.push(clickTrace);
        }

        let layout = {
            autosize: true,
            title:'Rate of Change of Intelligence',
            xaxis: {
                title: 'Time',
                tickfont: {
                    size: 13,
                },
                titlefont: {
                    size: 15,
                },
                tickwidth: 2,
                ticklen: 10,
                linewidth: 1.5
            },
            yaxis: {
                title: 'dI/dt',
                tickfont: {
                    size: 13,
                },
                titlefont: {
                    size: 15,
                },
                tickwidth: 2,
                ticklen: 10,
                linewidth: 1.5
            },
            showlegend: true,
            datarevision: this.plotCount
        };

        //Increase plotcount so that Plotly.react will work
        ++this.plotCount;

        //Plot graph
        let config = {responsive: true};
        Plotly.react(FLUID_INTELLIGENCE_GRAPH_DIV, traceArray, layout, config);
        if(DEBUG_INTELLIGENCE_GRAPHS) console.log("Intelligence change plotting complete.. Plot count: " + this.plotCount);
    }


    /** Adds listeners for graph events in plotly */
    addGraphEventListeners():void{
        //PI graph event handling for click events
        let ciPlot:any = document.getElementById(CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV);
        if(ciPlot !== null) {
            ciPlot.on('plotly_click', (event:PlotlyEvent) => {
                if(event.points !== null && event.points.length > 0) {
                    //Store click position.
                    this.ciClickX = event.points[0].x;

                    //Get the polynomial terms for the graph at this click point
                    this.polynomialTerms = this.iEngine.getPolynomialTerms(this.ciClickX);
                    if(DEBUG_FLUID_INTELLIGENCE) console.log(this.polynomialTerms);

                    this.replot();
                    if(DEBUG_EVENTS) console.log("User clicked on RoT Intelligence Graph, x position: " + this.ciClickX);
                }
            });
        }

        //Enables user to click on data plot to see how prediction match was calculated
        let dataPlot:any = document.getElementById(DATA_GRAPH_DIV);
        if(dataPlot !== null) {
            dataPlot.on('plotly_click', (event:PlotlyEvent) => {
                if(event.points !== null && event.points.length > 0) {
                    //Store point clicked on
                    this.dataClickIndex = event.points[0].x;

                    /* Don't allow user to click on area within time window at start of graph,
                    where there are no predictions  */
                    if(this.dataClickIndex <= this.ml.getTimeWindow())
                        this.dataClickIndex = -1;

                    this.replot();
                }
            });
        }
    }


    /** Sets the data class that provides the data for the analysis */
    setData(data:Data){
        this.data = data;

        //Use data store to generate colours, which has complete list of data sets.
        const dataStore:DataSet[] = data.getDataStore();

        //Store distinct color for each data set
        this.dataSetColors = Colors.getRandomColors(dataStore.length);
    }


    /** Hides specified element */
    hide(elementID:string){
        let element = document.getElementById(elementID);
        if(element === null)
            throw "Failed to hide: element not found: " + elementID;
        element.style.display = "none";
    }


    /** Shows specified element */
    show(elementID:string){
        let element = document.getElementById(elementID);
        if(element === null)
            throw "Failed to hide: element not found: " + elementID;
        element.style.display = "block";
    }

}
