import {IntelligenceEngine} from "./IntelligenceEngine.js";
import {CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV, FI_GRAPH_DIV_ID, PREDICTION_MATCH_GRAPH_DIV} from "./Globals.js";
import * as Util from "./Util.js"
import {DEBUG_CRYSTALLIZED_INTELLIGENCE, DEBUG_EVENTS, DEBUG_FLUID_INTELLIGENCE, DEBUG_GRAPHS} from "./Debug.js"
import {MazeLegends, PlotlyEvent} from "./DataTypes.js";
import {MazeManager} from "./MazeManager.js";
import {Maze} from "./Maze.js";
import * as DomUtil from '../common/DomUtil.js';
import * as Colors from '../common/Colors.js'

//Declare Plotly type
declare let Plotly:any;


/** Plots graphs for the agent maze */
export class Plotter {
    //Does intelligence calculations
    iEngine:IntelligenceEngine;

    //Maze Manager
    mazeManager:MazeManager;

    //Has the crystallized PI plot been clicked on?
    ciClickX:number = -1;

    //Array of polynomial terms for point that has been clicked on.
    polynomialTerms:Array<number> = [];

    //Increased each time a graph is plotted so that plotly knows to replot using react.
    plotCount:number = 0;

    //Used for display of legend for prediction match plot
    mazeLegends:MazeLegends;

    //Controls whether CI for individual mazes is displayed
    plotIndividualMazes:boolean = true;


    constructor(intelligenceEngine:IntelligenceEngine, mazeManager:MazeManager){
        this.iEngine = intelligenceEngine;
        this.mazeManager = mazeManager;

        //Store list of maze legends
        this.loadMazeLegends();
    }


    /** Triggered when maze selection has been changed */
    mazeSelectionChanged():void{
        //Reload maze legends
        //this.loadMazeLegends();
        this.plot();
    }


    /** Loads list of maze legends for plotting */
    loadMazeLegends(){
        //Clear maze legends
        this.mazeLegends = {};

        //Get array of colours excluding blue
        const colorArray:string[] = Colors.getRandomColors(this.mazeManager.size());

        //Build data structure for display of maze legends
        for(let i:number=0; i<this.mazeManager.size(); ++i){
            const maze:Maze = this.mazeManager.getByIndex(i);
            this.mazeLegends[maze.getId()] = {
                show: true,
                color: colorArray[i],
                title: maze.getName(),
                symbol: maze.getSymbol()
            };
        }
    }


    /** Sets x location for when user clicks on graph to view polynomial approximation for
     * fluid intelligence calculation
     * @param x
     */
    setCIClickX(x:number){
        this.ciClickX = x;
        if(DEBUG_EVENTS) console.log("EVENTS. setCIClickX. piClickX: " + x);
        if(DEBUG_CRYSTALLIZED_INTELLIGENCE) console.log(this.polynomialTerms);
    }


    /** Calls methods to draw graphs */
    plot(){
        this.plotMatch();
        this.plotCrystallizedIntelligence();
        this.plotFluidIntelligence();
    }


    /** Plots match between agent's prediction and reality
     *  for each location and direction in each maze. */
    plotMatch(){
        if(DEBUG_GRAPHS) console.log("Plotting match.");
        let traceArray = [];

        //Show legend for first plots then disable afterwards
        const mazeIDs:string[] = this.mazeManager.getMazeIDs();
        for(let id of mazeIDs){
            this.mazeLegends[id].show = true;
        }

        //Work through the time stamps
        //for(let x:number=0; x<this.iEngine.iMeasurements.length; ++x){
        for (let ts in this.iEngine.iMeasurements) {

            //Tracks across all measurements on all mazes
            let ctr: number = 0;

            //Work through the mazes with measurements for this time stamp
            for (let mazeID in this.iEngine.iMeasurements[ts]) {

                //Check to see if maze is currently selected
                if (this.mazeManager.mazeSelected(mazeID)) {

                    //X, Y and Z axes for this maze record
                    let xArr: number[] = [], yArr: number[] = [], zArr: number[] = [];

                    //Work through measurements for this maze
                    for (let mazeMeas of this.iEngine.iMeasurements[ts][mazeID]) {
                        //The x axis corresponds to the time stamp of the measurement
                        xArr.push(parseInt(ts));

                        //Y axis corresponds to a unique transition within a specific maze
                        yArr.push(ctr);
                        ++ctr;

                        //Z axis is the prediction match
                        zArr.push(mazeMeas.predMatch)
                    }

                    //Add trace of points for this maze
                    traceArray.push(this.getPMTrace(xArr, yArr, zArr, mazeID));
                }

            }
        }

        //Layout
        let layout = {
            title:'Prediction Match',
            scene: {
                xaxis: {
                    title: 'Intelligence Calculation',
                    tick0: 0,
                    tickmode: "auto"
                },
                yaxis: {
                    title: 'Maze Transition'
                },
                zaxis: {
                    title: 'Prediction Match'
                }
            },
            showlegend: true,
            legend: {
                x: 1,
                y: 0.5
            },
            autosize: true,
            width: 800,
            height: 800,
            datarevision: this.plotCount
        };
        let config = {responsive: true};

        //Increase plotCount so that Plotly.react works
        ++this.plotCount;

        //Plot graph
        Plotly.react(PREDICTION_MATCH_GRAPH_DIV, traceArray, layout, config);
        if(DEBUG_GRAPHS) console.log("Prediction match plotting complete.");
    }


    /** Builds and returns a trace for the prediction match graph */
    private getPMTrace(xArr:number[], yArr:number[], zArr:number[], mazeID:string){
        //Build and return trace
        let trace = {
            type: 'scatter3d',
            mode: 'lines',
            x: xArr,
            y: yArr,
            z: zArr,
            opacity: 1,
            line: {
                width: 10,
                color: this.mazeLegends[mazeID].color
            },
            legendgroup: this.mazeLegends[mazeID].title,
            name: this.mazeLegends[mazeID].title,
            showlegend: this.mazeLegends[mazeID].show
        };

        //Switch off legend display
        this.mazeLegends[mazeID].show = false;

        return trace;
    }


    /** Plots the crystallized intelligence
     * */
    plotCrystallizedIntelligence() {
        if(DEBUG_GRAPHS) console.log("Plotting predictive intelligence.");

        //Build traces
        //Trace for total crystallized intelligence
        let traceArray:any[] = [];
        let mainTrace = {
            x: this.iEngine.ciTotalXArray,
            y: this.iEngine.ciTotalYArray,
            mode: 'lines+markers',
            name: `Total (max: ${Util.round(this.iEngine.maxCI, 2)})`,
            line: {
                color: 'rgb(0,0,255)',
                width: 3
            },
            marker: {
                size: 10
            },
            showlegend: true
        };
        traceArray.push(mainTrace);

        //Traces for the intelligence of individual mazes
        if(this.plotIndividualMazes) {
            for (let mazeID in this.iEngine.ciMazePlot) {
                if (this.mazeManager.contains(mazeID)) {
                    const mazeTrace = {
                        x: this.iEngine.ciMazePlot[mazeID].x,
                        y: this.iEngine.ciMazePlot[mazeID].y,
                        mode: 'lines+markers',
                        name: `${this.mazeLegends[mazeID].title} (max: ${Util.round(this.iEngine.mazeMaxCIs[mazeID], 2)})`,
                        line: {
                            color: this.mazeLegends[mazeID].color,
                            width: 1
                        },
                        marker: {
                            symbol: this.mazeLegends[mazeID].symbol,
                            size: 10
                        },
                        showlegend: true
                    }
                    traceArray.push(mazeTrace);
                }
            }
        }

        //Highlight the point that has been clicked on.
        if(this.ciClickX > 0) {
            let clickTrace = {
                x: [ this.ciClickX ],
                y: [ this.iEngine.ciTotalYArray[this.ciClickX] ],
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
                tick0: 0,
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
        if(DEBUG_GRAPHS) console.log("Intelligence plotting complete. Plot count: " + this.plotCount);
    }


    /** Plots the fluid intelligence */
    plotFluidIntelligence(){
        let mainTrace = {
            x: this.iEngine.fiXArray,
            y: this.iEngine.fiYArray,
            mode: 'lines+markers',
            name: 'dI/dt',
            line: {
                color: 'rgb(0, 0, 0)',
                width: 3
            },
            marker: {
                color: 'rgb(0, 0, 0)',
                size: 10
            }
        };

        let traceArray = [mainTrace];

        //Highlight the point that has been clicked on.
        if(this.ciClickX !== -1 && this.polynomialTerms.length > 0) {
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
                    size: 15
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

        let config = {responsive: true};
        Plotly.react(FI_GRAPH_DIV_ID, traceArray, layout, config);
    }


    /** Adds listeners for graph events in plotly */
    addGraphEventListeners():void{
        //PI graph event handling for click events
        let myPlot:any = DomUtil.getDiv(CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV);
        if(myPlot !== null) {
            myPlot.on('plotly_click', (event:PlotlyEvent) => {
                if(event.points !== null && event.points.length > 0) {
                    //Store click position.
                    this.ciClickX = event.points[0].x;

                    //Get the polynomial terms for the graph at this click point
                    this.polynomialTerms = this.iEngine.getPolynomialTerms(this.ciClickX);
                    if(DEBUG_FLUID_INTELLIGENCE) console.log(this.polynomialTerms);

                    this.plot();
                    if(DEBUG_EVENTS) console.log("User clicked on Crystallized Intelligence Graph, x position: " + this.ciClickX);
                }
            });
        }
    }


    /** Clears x location for visualisation of polynomial approximation */
    clearCIClickX(){
        this.ciClickX = -1;
    }

}