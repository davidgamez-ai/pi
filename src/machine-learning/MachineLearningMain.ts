import {Data} from "./Data.js";
import {Plotter} from "./Plotter.js";
import {DataSet} from "./Types.js";
import {MachineLearning} from "./MachineLearning.js";
import {DEBUG_EVENTS, MEASURE_PERFORMANCE} from "./Debug.js";
import {
    BATCH_SIZE_INPUT,
    BUILD_BUTTON,
    CLEAR_TRAINING_BUTTON,
    CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV,
    DATA_SELECT,
    EPOCH_INPUT,
    LSTM_UNITS_INPUT,
    NUM_MODELS_INPUT,
    RESET_BUTTON,
    TEST_PERCENT_INPUT,
    TIME_WINDOW_INPUT,
    START_TRAINING_BUTTON,
    STOP_TRAINING_BUTTON,
    TRAIN_PERCENT_INPUT,
    TRAINING_CYCLES_INPUT,
    VALIDATION_PERCENT_INPUT,
    PREDICTION_PROBABILITY_GRAPH_DIV,
    PREDICTION_MATCH_GRAPH_DIV,
    FLUID_INTELLIGENCE_GRAPH_DIV,
    DATA_GRAPH_DIV,
    RECALCULATE_INTELLIGENCE_BUTTON,
    SELECT_DATA_SETS_BUTTON,
    DATA_SET_SELECTION_MODAL,
    MODAL_DATA_SET_LIST,
    CLOSE_DATA_SELECT_BUTTON,
    COMPRESSIBILITY_MODAL,
    CLOSE_COMPRESSIBILITY_MODAL_BUTTON,
    SHOW_COMPRESSIBILITY_MODAL_BUTTON,
    TOTAL_COMPRESSIBILITY_SPAN,
    DATA_SET_COMPRESSIBILITY_DIV,
    DATA_SPLIT_SLIDER,
    CLEAR_GRAPH_SELECTION_BUTTON,
    PLOT_CI_INDIVIDUAL_DATASETS_CB,
    P_VALUE_SELECT, PLOT_BATCH_LOSS_CB
} from "./Constants.js";
import {IntelligenceEngine} from "./IntelligenceEngine.js";
import {Logger} from "./Logger.js";
import * as DomUtil from '../common/DomUtil.js';
import {TTest} from "../t-table/TTest.js";

//Declare type of jQuery
declare let $:any;


/** MachineLearningMain class for machine learning part of application */
export class MachineLearningMain {
    //References to other classes
    plotter:Plotter;
    ml:MachineLearning;
    data:Data;
    iEngine:IntelligenceEngine;

    //Records built state
    built:boolean = false;


    constructor() {
        //Create instances of classes
        this.ml = new MachineLearning();
        this.plotter = new Plotter();
        this.data = new Data();
        this.iEngine = new IntelligenceEngine();

        //Set up listeners for events
        this.addListeners();

        //Build data select modal
        this.buildModals();

        //Inject dependencies
        this.ml.plotter = this.plotter;
        this.ml.data = this.data;
        this.ml.iEngine = this.iEngine;
        this.plotter.ml = this.ml;
        this.plotter.setData(this.data);
        this.plotter.iEngine = this.iEngine;
        this.plotter.main = this;
        this.iEngine.data = this.data;
        this.iEngine.ml = this.ml;

        //Fire reset button to disable training controls
        $("#"+RESET_BUTTON).trigger("onclick");
    }


    /** Sets up listeners for different types of events */
    addListeners(){
        this.addSelectListeners();
        this.addButtonListeners();
        this.addModalListeners();
        this.addSliderListener();
        this.addCustomEventListeners();
        this.addCheckBoxListeners();
    }


    /** Builds modals */
    buildModals(){
        //Get element holding list of data sets
        const dataSetList:HTMLDivElement = DomUtil.getDiv(MODAL_DATA_SET_LIST);
        if(dataSetList === null)
            throw "Data set list div not found.";

        //Get complete set of data
        const dataStore:DataSet[] = this.data.getDataStore();
        if(dataStore.length !== this.data.dataSets.length)
            throw "Building modal - data store length should match data sets length";

        let listStr = "";
        for(let ds of this.data.dataSets){
            listStr += "<p><input type='checkbox' checked> " + ds.name + "</p>";
        }
        dataSetList.innerHTML = listStr;
    }


    /** Adds listeners for checkboxes */
    addCheckBoxListeners(){
        const plotIndividualDataSetsCB:HTMLInputElement = DomUtil.getInput(PLOT_CI_INDIVIDUAL_DATASETS_CB);
        this.plotter.plotIndividualDatasets = plotIndividualDataSetsCB.checked;//Synchronize initial state
        plotIndividualDataSetsCB.onclick = event => {
            this.plotter.plotIndividualDatasets = plotIndividualDataSetsCB.checked;

            //Replot graphs
            this.plotter.plotCrystallizedIntelligence();
        }
        const plotBatchLossCB:HTMLInputElement = DomUtil.getInput(PLOT_BATCH_LOSS_CB);
        this.plotter.plotBatchLoss = plotBatchLossCB.checked;//Synchronize initial state
        plotBatchLossCB.onclick = event => {
            this.plotter.plotBatchLoss = plotBatchLossCB.checked;
        }
    }


    /** Adds listeners for modals */
    addModalListeners(){
        //Data modal
        const dataSelectModal:HTMLDivElement = DomUtil.getDiv(DATA_SET_SELECTION_MODAL);

        //Launch data select modal
        const selectDataSetsButton:HTMLButtonElement = DomUtil.getButton(SELECT_DATA_SETS_BUTTON);
        selectDataSetsButton.onclick = async event => {
            dataSelectModal.style.display = "block";
        };

        //Close data selection modal
        const closeDataSelectModalButton:HTMLSpanElement = DomUtil.getButton(CLOSE_DATA_SELECT_BUTTON);
        closeDataSelectModalButton.onclick = async event => {
            dataSelectModal.style.display = "none";
            this.updateDataSelection();
        }
        window.onclick = (event:any) => {
            if (event.target == dataSelectModal) {
                dataSelectModal.style.display = "none";
                this.updateDataSelection();
            }
        }

        //Compressibility modal
        const compressibilityModal:HTMLDivElement = DomUtil.getDiv(COMPRESSIBILITY_MODAL);

        //Launch compressibility modal
        const showCompressibilityButton:HTMLButtonElement = DomUtil.getButton(SHOW_COMPRESSIBILITY_MODAL_BUTTON);
        showCompressibilityButton.onclick = async event => {
            compressibilityModal.style.display = "block";
        };

        //Close compressibility modal
        const closeCompressibilityModalButton:HTMLSpanElement = DomUtil.getButton(CLOSE_COMPRESSIBILITY_MODAL_BUTTON);
        closeCompressibilityModalButton.onclick = async event => {
            compressibilityModal.style.display = "none";
        }
        window.onclick = (event:any) => {
            if (event.target == compressibilityModal) {
                compressibilityModal.style.display = "none";
            }
        }
    }


    /** User can select which data sets they want to use for the analysis
     *  This method updates the selection after this has been made by user.
     */
    updateDataSelection(){
        //Get complete set of data
        const dataStore:DataSet[] = this.data.getDataStore();

        //Clear current selection
        this.data.dataSets = [];

        //Reference to data select drop down
        const dataSelect:HTMLSelectElement = DomUtil.getSelect(DATA_SELECT);

        //Clear list of data sets
        dataSelect.options.length = 0;

        //Get the check boxes
        const dataCheckBoxes = document.querySelectorAll("#" + MODAL_DATA_SET_LIST + " input" );

        //Add set to data sets used for analysis
        let ctr:number = 0;
        for(let i=0; i<dataCheckBoxes.length; ++i){
            let checked:boolean = (<HTMLInputElement>dataCheckBoxes[i]).checked;
            if(checked){
                //Add to list of data sets for analysis
                this.data.dataSets.push(dataStore[i]);

                //Add name of data set to drop down
                dataSelect.options[ctr] = new Option(dataStore[i].name, dataStore[i].name);
                ++ctr;
            }
        }

        //Select first item on new list
        if(this.data.dataSets.length > 0) {
            this.data.dataIndex = 0;
            DomUtil.show(DATA_GRAPH_DIV);
        }
        else{
            this.data.dataIndex = -1;
            DomUtil.hide(DATA_GRAPH_DIV);
        }

        //Print out stats of current data sets
        if(MEASURE_PERFORMANCE) this.data.printStatistics();

        //Plot graph of first item on new list.
        this.plotDataGraph();
    }


    /** Adds button listeners for application */
    addButtonListeners(){
        const startTrainingButton:HTMLButtonElement = DomUtil.getButton(START_TRAINING_BUTTON);
        startTrainingButton.onclick = async event => {
            //Update parameters
            this.updateTrainingParameters();

            //Set stop training to false
            this.ml.stopTraining = false;

            //Disable inputs
            DomUtil.disableInput(EPOCH_INPUT);
            DomUtil.disableInput(BATCH_SIZE_INPUT);
            DomUtil.disableInput(TRAINING_CYCLES_INPUT);

            //Enable stop training button
            DomUtil.disableButton(START_TRAINING_BUTTON);
            DomUtil.enableButton(STOP_TRAINING_BUTTON);
            DomUtil.disableButton(RECALCULATE_INTELLIGENCE_BUTTON);

            //Start training
            //Work through the training cycles
            for(let t:number=0; t<this.ml.trainingCycles && !this.ml.stopTraining; ++t) {
                Logger.info("Training cycle " + (t+1) );
                await this.ml.train();
            }

            //Inform user
            if(this.ml.stopTraining)
                Logger.info("Training stopped and possibly incomplete");
            else
                Logger.info("Training complete.");

            //Enable start training button
            DomUtil.enableButton(START_TRAINING_BUTTON);
            DomUtil.enableButton(RECALCULATE_INTELLIGENCE_BUTTON);
            DomUtil.disableButton(STOP_TRAINING_BUTTON);
            DomUtil.enableInput(EPOCH_INPUT);
            DomUtil.enableInput(BATCH_SIZE_INPUT);
            DomUtil.enableInput(TRAINING_CYCLES_INPUT);
        };

        const stopTrainingButton:HTMLButtonElement = DomUtil.getButton(STOP_TRAINING_BUTTON);
        stopTrainingButton.onclick = async event => {
            this.ml.stopTraining = true;
            Logger.info("Waiting for training to stop");
        };

        const clearTrainingButton:HTMLButtonElement = DomUtil.getButton(CLEAR_TRAINING_BUTTON);
        clearTrainingButton.onclick = event => {
            //Rebuild models
            this.ml.buildModels();

            //Re-generate predictions
            this.ml.predict();
        };

        const buildButton:HTMLButtonElement = DomUtil.getButton(BUILD_BUTTON);
        buildButton.onclick = event => {
            Logger.info("Loading... please wait.");

            //Check to see if any data sets loaded
            if(this.data.dataSets.length === 0){
                window.alert("No datasets selected.");
                return;
            }

            //Record state for other controls
            this.built = true;

            //Disable controls for setting data and model parameters
            $('#DataSplitSlider').slider({ disabled: true });
            DomUtil.disableInput(TIME_WINDOW_INPUT);
            DomUtil.disableInput(LSTM_UNITS_INPUT);
            DomUtil.disableInput(NUM_MODELS_INPUT);
            DomUtil.disableButton(SELECT_DATA_SETS_BUTTON);

            //Update parameters
            this.updateDataParameters();
            this.updateModelParameters();

            //Calculate maximum crystallized intelligence
            this.iEngine.calculateMaxCrystallizedIntelligence();

            //Build data and models
            this.ml.buildModels();
            this.ml.buildSequenceData();

            //Generate predictions on untrained model
            this.ml.predict();

            //Disable build button
            DomUtil.disableButton(BUILD_BUTTON);

            //Enable other controls
            DomUtil.enableButton(RESET_BUTTON);
            DomUtil.enableButton(CLEAR_TRAINING_BUTTON);
            DomUtil.enableButton(START_TRAINING_BUTTON);
            DomUtil.enableButton(RECALCULATE_INTELLIGENCE_BUTTON);
            DomUtil.enableButton(SHOW_COMPRESSIBILITY_MODAL_BUTTON);
            DomUtil.enableInput(EPOCH_INPUT);
            DomUtil.enableInput(BATCH_SIZE_INPUT);
            DomUtil.enableInput(TRAINING_CYCLES_INPUT);

            //Add listener for click events on graph
            this.plotter.addGraphEventListeners();
        };

        const resetButton:HTMLButtonElement = DomUtil.getButton(RESET_BUTTON);
        resetButton.onclick = event => {
            //Record state for other controls
            this.built = false;

            //Show controls for setting data and model parameters
            $('#DataSplitSlider').slider({ disabled: false });
            DomUtil.enableInput(TIME_WINDOW_INPUT);
            DomUtil.enableInput(LSTM_UNITS_INPUT);
            DomUtil.enableInput(NUM_MODELS_INPUT);
            DomUtil.enableButton(SELECT_DATA_SETS_BUTTON);

            //Plot data graph without predictions
            this.plotDataGraph();

            //Clear data stored in intelligence engine
            this.iEngine.reset();

            //Enable build button
            DomUtil.enableButton(BUILD_BUTTON);

            //Disable other controls
            DomUtil.disableButton(RESET_BUTTON);
            DomUtil.disableButton(CLEAR_TRAINING_BUTTON);
            DomUtil.disableButton(START_TRAINING_BUTTON);
            DomUtil.disableButton(STOP_TRAINING_BUTTON);
            DomUtil.disableButton(RECALCULATE_INTELLIGENCE_BUTTON);
            DomUtil.disableInput(EPOCH_INPUT);
            DomUtil.disableButton(SHOW_COMPRESSIBILITY_MODAL_BUTTON);
            DomUtil.disableInput(BATCH_SIZE_INPUT);
            DomUtil.disableInput(TRAINING_CYCLES_INPUT);

            //Hide the graphs
            DomUtil.hide(PREDICTION_PROBABILITY_GRAPH_DIV);
            DomUtil.hide(PREDICTION_MATCH_GRAPH_DIV);
            DomUtil.hide(CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV);
            DomUtil.hide(FLUID_INTELLIGENCE_GRAPH_DIV);
        };

        const recalcIntelButton:HTMLButtonElement = DomUtil.getButton(RECALCULATE_INTELLIGENCE_BUTTON);
        recalcIntelButton.onclick = event => {
            //Re-calculate intelligence
            this.iEngine.update();

            //Replot graphs
            this.plotter.plotCrystallizedIntelligence();
            this.plotter.plotFluidIntelligence();
        };

        const clearGraphSelectionButton:HTMLButtonElement = DomUtil.getButton(CLEAR_GRAPH_SELECTION_BUTTON);
        clearGraphSelectionButton.onclick = event => {
            this.plotter.ciClickX = -1;
            this.plotter.plotCrystallizedIntelligence();
            this.plotter.plotFluidIntelligence();
        };
    }


    /** Adds events that are triggered by document.dispatchEvent */
    addCustomEventListeners(){
        //Updates display of intelligence.
        document.addEventListener('UpdateCompressibility', event => {
            if(DEBUG_EVENTS) console.log("EVENTS. UpdateCompressibility event received.");

            //Update total compressibility
            DomUtil.getSpan(TOTAL_COMPRESSIBILITY_SPAN).innerHTML = this.iEngine.totalEnvironmentCompressibility.toString();

            //Update compressibilty of each data set considered independently
            let dsCompStr:string = "";
            for(let dsComp of this.iEngine.dataSetCompressibility){
                dsCompStr += "<p>" + dsComp.name + ": " + dsComp.compressibility + "</p>";
            }
            DomUtil.getDiv(DATA_SET_COMPRESSIBILITY_DIV).innerHTML = dsCompStr;
        });
    }


    plotDataGraph(){
        if(this.data.dataSets.length > 0 && !this.built) {
            this.updateDataParameters();//Get train, validation, test split
            this.plotter.dataClickIndex = -1;
            this.plotter.plotData();
        }
    }


    /** Adds listeners for drop down menus */
    addSelectListeners(){
        //Get reference to data select drop down
        const dataSelect:HTMLSelectElement = DomUtil.getSelect(DATA_SELECT);

        //Add complete list of data sets
        let dataStore:DataSet[] = this.data.getDataStore();
        for(let i:number=0; i<dataStore.length; ++i)
            dataSelect.options[i] = new Option(dataStore[i].name, dataStore[i].name);

        //Choose the data set
        if(dataSelect !== null){
            //Listen for changes
            dataSelect.onchange = event => {
                let target:HTMLSelectElement = <HTMLSelectElement> event.target;
                if(target !== null){//Network loaded etc.
                    //Update parameters if network not built
                    if(!this.built)
                        this.updateDataParameters();

                    //Find data and load set
                    for(let i:number=0; i<this.data.dataSets.length; ++i){
                        if(this.data.dataSets[i].name === target.value && i !== this.data.dataIndex){
                            //Store new data index
                            this.data.dataIndex = i;

                            //Reset data click and hide probability graph
                            this.plotter.dataClickIndex = -1;
                            DomUtil.hide(PREDICTION_PROBABILITY_GRAPH_DIV);

                            //Plot appropriate graphs
                            this.plotter.plotData();
                            if(this.built)
                                this.plotter.plotPredictionMatch();

                            if(DEBUG_EVENTS) console.log("EVENTS. Data set change. New set name: " + target.value);
                            return;
                        }
                    }
                    throw "Data set not found: " + target.value;
                }
            }
        }

        //Get reference to pValue select drop down
        const pValueSelect:HTMLSelectElement = DomUtil.getSelect(P_VALUE_SELECT);

        //Add complete list of p-values
        const pValueArray:number[] = TTest.getOneTailPValues();
        for(let i:number=0; i<pValueArray.length; ++i) {
            pValueSelect.options[i] = new Option(pValueArray[i].toString(), pValueArray[i].toString());
        }

        //Add listener
        pValueSelect.onchange = event => {
            const target:HTMLSelectElement = <HTMLSelectElement> event.target;
            if(target !== null){
                //Update p-value
                this.iEngine.setPValue(parseFloat(target.value));
            }
        }

        //Set initial p-value
        this.iEngine.setPValue(parseFloat(pValueSelect.value));
    }


    /** Sets up slider to select ratio between train, validate and test */
    addSliderListener(){
        $("#" + DATA_SPLIT_SLIDER).slider({
            range: true,
            min: 0,
            max: 100,
            values: [70, 85],
            slide: ( event:any, ui:any ) => {
                //Get Values
                let train = ui.values[0];
                let validate = ui.values[1] - train;
                let test = 100 - validate - train;

                //Update feedback
                $("#TrainPercentInput").html(train + "%");
                $("#ValidationPercentInput").html(validate + "%");
                $("#TestPercentInput").html(test + "%");

                //Set values
                this.ml.trainPercent = train;
                this.ml.validationPercent = validate;
                this.ml.testPercent = test;

                //Replot if model and data have not been built.
                this.plotDataGraph();
            }
        });

    }


    /** Extracts training parameters and sets them in appropriate classes */
    updateTrainingParameters():void{
        try {
            //Update parameters
            this.ml.batchSize = this.getIntParameter(BATCH_SIZE_INPUT);
            this.ml.epochs = this.getIntParameter(EPOCH_INPUT);
            this.ml.trainingCycles = this.getIntParameter(TRAINING_CYCLES_INPUT);
        }
        catch(err) {
            console.error(err);
        }
    }


    /** Extracts data parameters and sets them in appropriate classes */
    updateDataParameters():void{
        try {
            //Update parameters
            this.ml.trainPercent = this.getPercentParameter(TRAIN_PERCENT_INPUT);
            this.ml.validationPercent = this.getPercentParameter(VALIDATION_PERCENT_INPUT);
            this.ml.testPercent = this.getPercentParameter(TEST_PERCENT_INPUT);
            this.ml.setTimeWindow(this.getIntParameter(TIME_WINDOW_INPUT));
        }
        catch(err) {
            console.error(err);
        }
    }


    /** Extracts model parameters and sets them in appropriate classes */
    updateModelParameters():void{
        try {
            //Update parameters
            this.ml.setLSTMUnits(this.getIntParameter(LSTM_UNITS_INPUT));
            this.ml.setNumberOfModels(this.getIntParameter(NUM_MODELS_INPUT));
        }
        catch(err) {
            console.error(err);
        }
    }


    /** Returns the value of an integer parameter from the input
     *  with the specified ID.
     * @param elementId
     */
    getIntParameter(elementId:string):number{
        let elem:HTMLInputElement = <HTMLInputElement> document.getElementById(elementId);
        if(elem === null)
            throw "Input element with ID " + elementId + " not found!";
        return parseInt(elem.value);
    }


    /** Returns the value of a percent parameter from the input
     *  with the specified ID.
     * @param elementId
     */
    getPercentParameter(elementId:string):number{
        let elem:HTMLSpanElement = <HTMLSpanElement> document.getElementById(elementId);
        if(elem === null)
            throw "Input element with ID " + elementId + " not found!";

        //Strip the % sign off and convert to int
        let val:string = elem.innerText;
        return parseInt(val.slice(0, val.length-1));
    }

}