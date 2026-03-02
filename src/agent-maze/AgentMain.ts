import { Maze } from './Maze.js';
import { Agent } from './Agent.js'
import {MazeManager} from "./MazeManager.js";
import {AgentController} from "./AgentController.js";
import {IntelligenceEngine} from "./IntelligenceEngine.js";
import {DEBUG_EVENTS} from "./Debug.js";
import {Plotter} from "./Plotter.js"
import {Complexity} from "./Complexity.js";
import * as Util from './Util.js';
import {
    NULL,
    EMPTY,
    WALL,
    REWARD,
    UP,
    DOWN,
    LEFT,
    RIGHT,
    MAZE_CANVAS,
    MAZE_SELECT_COMBO,
    MAZE_SELECT_BUTTON,
    START_EXPLORE_MAZE_BUTTON,
    AGENT_LEARNING_CHECKBOX,
    STOP_EXPLORE_MAZE_BUTTON,
    RECALCULATE_INTELLIGENCE_SPAN,
    RECALCULATE_INTELLIGENCE_INTERVAL_INPUT,
    DEFAULT_ICALC_FREQUENCY,
    RESET_AGENT_BUTTON,
    MODAL_MAZE_LIST,
    MAZE_SELECT_MODAL,
    CLOSE_MAZE_SELECT_BUTTON,
    MAZE_SELECT_FEEDBACK,
    PLOT_CI_INDIVIDUAL_MAZES_CHECKBOX,
    CLEAR_GRAPH_SELECTION_BUTTON,
    MAZE_COMPRESSIBILITY_MODAL,
    SHOW_MAZE_COMPRESSIBILITY_BUTTON,
    CLOSE_MAZE_COMPRESSIBILITY_BUTTON,
    TOTAL_MAZE_COMPRESSIBILITY, MAZE_COMPRESSIBILITY
} from './Globals.js';
import {Logger} from "./Logger.js";
import {mazeMaps} from "./MazeMaps.js";
import * as DomUtil from '../common/DomUtil.js';
import {MazeIds} from "./DataTypes";
import {Timer} from "../common/Timer.js";


/** Sets up the agent and maze in the page */
export class AgentMain {
    //Classes controlled by this class.
    agent:Agent;
    agentController:AgentController;
    iEngine:IntelligenceEngine;
    complexity:Complexity;
    plotter:Plotter;
    mazeManager:MazeManager;

    //References to HTML elements
    mazeSelectCombo:HTMLSelectElement;
    mazeSelectButton:HTMLButtonElement;
    startExploreMazeButton:HTMLButtonElement;
    agentLearningCB:HTMLInputElement;
    recalcIntelSpan:HTMLSpanElement;
    plotCIIndividualMazesCB:HTMLInputElement;


    constructor(width:number, height:number){
        //Get reference to canvas for drawing agent and maze
        const mazeCanvas = DomUtil.getCanvas(MAZE_CANVAS);
        mazeCanvas.width = width;
        mazeCanvas.height = height;

        //Get references to elements
        this.mazeSelectCombo = DomUtil.getSelect(MAZE_SELECT_COMBO);
        this.mazeSelectButton = DomUtil.getButton(MAZE_SELECT_BUTTON);
        this.startExploreMazeButton = DomUtil.getButton(START_EXPLORE_MAZE_BUTTON);
        this.agentLearningCB = DomUtil.getInput(AGENT_LEARNING_CHECKBOX);
        this.recalcIntelSpan = DomUtil.getSpan(RECALCULATE_INTELLIGENCE_SPAN);
        this.plotCIIndividualMazesCB = DomUtil.getInput(PLOT_CI_INDIVIDUAL_MAZES_CHECKBOX);

        //Create maze manager
        this.mazeManager = new MazeManager();

        //Create class that handles complexity calculations
        this.complexity = new Complexity(this.mazeManager);

        //Add an agent
        this.agent = new Agent(this.mazeManager.getCurrent());

        //Create class that measures intelligence
        this.iEngine = new IntelligenceEngine(this.mazeManager, this.complexity);

        //Create agent controller
        this.agentController = new AgentController(this.agent, this.mazeManager, this.iEngine, this.complexity);

        //Inject intelligence engine into agent
        this.agent.setIntelligenceEngine(this.iEngine);

        //Create class that plots graphs
        this.plotter = new Plotter(this.iEngine, this.mazeManager);

        //Build modals
        this.buildModals();

        //Add listeners
        this.addListeners();

        //Make first intelligence calculations
        document.dispatchEvent(new CustomEvent('UpdateIntelligence'));

        //Set up plotly listener for click events
        //This must be called after graph has been plotted at least once.
        this.plotter.addGraphEventListeners();
    }


    /** Builds modal dialogs  */
    buildModals():void{
        //Build modal to select which mazes will be used in the experiments
        //Get element that will display list of mazes
        const modalMazeList:HTMLDivElement = DomUtil.getDiv(MODAL_MAZE_LIST);

        //Work through mazes and add checkboxes for each one
        let listStr = "";
        for(let maze of mazeMaps){
            listStr += "<p><input type='checkbox' checked value='" + maze.id +"'> " + maze.name + "</p>";
        }
        modalMazeList.innerHTML = listStr;

        //Build modal to display compressibility of mazes
        const mazeCompressibilityModal = DomUtil.getDiv(MAZE_COMPRESSIBILITY_MODAL);

        //Launch compressibility modal
        const showCompressibilityButton:HTMLButtonElement = DomUtil.getButton(SHOW_MAZE_COMPRESSIBILITY_BUTTON);
        showCompressibilityButton.onclick = async event => {
            mazeCompressibilityModal.style.display = "block";
        };

        //Close compressibility modal
        const closeCompressibilityModalButton:HTMLSpanElement = DomUtil.getButton(CLOSE_MAZE_COMPRESSIBILITY_BUTTON);
        closeCompressibilityModalButton.onclick = async event => {
            mazeCompressibilityModal.style.display = "none";
        }
        window.onclick = (event:any) => {
            if (event.target == mazeCompressibilityModal) {
                mazeCompressibilityModal.style.display = "none";
            }
        }

        //Fill maze compressibility modal with data for all mazes
        const mazeIDs:string[] = this.mazeManager.getMazeIDs();
        let compHTMLStr:string = "";
        for(let mID of mazeIDs){
            compHTMLStr += `<div> ${this.mazeManager.getByID(mID).getName()}: ${this.complexity.getMazesCompressionRatio_LZUTF8([mID])}.`;
        }
        DomUtil.getParagraph(MAZE_COMPRESSIBILITY).innerHTML = compHTMLStr;

        const totalCom:number = this.complexity.getMazesCompressionRatio_LZUTF8(mazeIDs);
        DomUtil.getSpan(TOTAL_MAZE_COMPRESSIBILITY).innerHTML = Util.round(totalCom, 2).toString();
    }


    /** Adds listeners */
    addListeners():void {
        this.addKeyboardListeners();
        this.addCheckBoxListeners();
        this.addSelectListeners();
        this.addCustomEventListeners();
        this.addButtonListeners();
        this.addInputListeners();
        this.addModalListeners();
    }


    /** Adds listeners for modals */
    addModalListeners() {
        //Maze modal
        const mazeSelectModal: HTMLDivElement = DomUtil.getDiv(MAZE_SELECT_MODAL);

        //Area for feedback to user
        const mazeSelectFeedback:HTMLDivElement = DomUtil.getDiv(MAZE_SELECT_FEEDBACK);

        //Launch maze select modal
        const mazeSelectButton: HTMLButtonElement = DomUtil.getButton(MAZE_SELECT_BUTTON);
        mazeSelectButton.onclick = async event => {
            mazeSelectFeedback.innerHTML = "";//Clear feedback
            mazeSelectModal.style.display = "block";
        };

        //Close maze selection modal
        const closeDataSelectModalButton: HTMLSpanElement = DomUtil.getButton(CLOSE_MAZE_SELECT_BUTTON);
        closeDataSelectModalButton.onclick = async event => {
            //Check that at least one maze is selected
            if(this.mazeSelected()) {
                mazeSelectModal.style.display = "none";
                this.updateMazeSelection();
            }
            else{
                mazeSelectFeedback.innerHTML = "You must select at least one maze.";
            }
        }
        window.onclick = (event: any) => {
            if (event.target == mazeSelectModal) {
                if(this.mazeSelected()) {
                    mazeSelectModal.style.display = "none";
                    this.updateMazeSelection();
                }
                else{
                    mazeSelectFeedback.innerHTML = "You must select at least one maze.";
                }
            }
        }
    }


    /** Adds keyboard listeners */
    addKeyboardListeners(){
        document.addEventListener('keydown', event =>{
            //console.log("KEY: " + event.keyCode);
            if(event.key === 'ArrowUp'){
                this.agent.setDirection(UP);
                this.draw();
            }
            else if(event.key === 'ArrowDown'){
                this.agent.setDirection(DOWN);
                this.draw();
            }
            else if(event.key === 'ArrowLeft'){
                this.agent.setDirection(LEFT);
                this.draw();
            }
            else if(event.key === 'ArrowRight'){
                this.agent.setDirection(RIGHT);
                this.draw();
            }
            else if(event.code === "Space"){
                event.preventDefault();//Prevent space bar scrolling
                this.agent.move();
                this.draw();
            }
        });
    }


    /** Adds listeners for drop down menus */
    addSelectListeners(){
        //Choose the maze
        if(this.mazeSelectCombo !== null){
            //Add options
            for(let i:number=0; i<this.mazeManager.size(); i++) {
                const maze:Maze = this.mazeManager.getByIndex(i);
                this.mazeSelectCombo.options[i] = new Option(maze.getName(), maze.getId().toString());
            }

            //Listen for changes
            this.mazeSelectCombo.onchange = event => {
                if(DEBUG_EVENTS) console.log("EVENTS. Maze change. New maze id: " + this.mazeSelectCombo.value);

                //Change the current maze in the maze manager
                this.mazeManager.load( (this.mazeSelectCombo.value) );

                //Load up the new maze in the agent
                this.agent.setMaze(this.mazeManager.getCurrent());

                //Redraw
                this.draw();
            }
        }
    }


    /** Adds listeners for checkboxes */
    addCheckBoxListeners(){
        this.agentLearningCB.onclick = event => {
            this.agent.learning = this.agentLearningCB.checked;
            if(this.agent.learning){
                this.recalcIntelSpan.style.visibility = "visible";
            }
            else
                this.recalcIntelSpan.style.visibility = "hidden";
        }
        this.plotCIIndividualMazesCB.onclick = event => {
            this.plotter.plotIndividualMazes = this.plotCIIndividualMazesCB.checked;

            //Replot graphs
            this.plotter.plot();
        }
    }


    /** Adds custom event handlers */
    addCustomEventListeners(){
        //Updates display of intelligence.
        document.addEventListener('UpdateIntelligence', event => {
            if(DEBUG_EVENTS) console.log("EVENTS. UpdateIntelligence event received.");

            //Measure intelligence of agent across all mazes.
            this.agentController.measureIntelligence();

            //Replot graphs
            this.plotter.plot();
        });

        //Triggered when maze exploration stops for some reason.
        document.addEventListener('FullMazeExplorationStopped', event => {
            this.startExploreMazeButton.disabled = false;
            this.mazeSelectCombo.disabled = false;
            this.mazeSelectButton.disabled = false;
        });
    }


    /** Adds listeners to input fields */
    addInputListeners(){
        let recalcIntelIntervalInput:HTMLInputElement = DomUtil.getInput(RECALCULATE_INTELLIGENCE_INTERVAL_INPUT);
        recalcIntelIntervalInput.value = DEFAULT_ICALC_FREQUENCY.toString();
        recalcIntelIntervalInput.addEventListener('input', event => {
            let input:HTMLInputElement = <HTMLInputElement>event.target;
            if(input !== null){
                if(DEBUG_EVENTS) console.log("Setting intelligence calculation interval: " + input.value);
                this.agent.iCalcFreq = parseInt(input.value);
            }
        });
    }


    /** Adds listeners for button events */
    addButtonListeners(){
        //Start full maze exploration
        if(this.startExploreMazeButton !== null){
            this.startExploreMazeButton.onclick = event => {
                this.agentController.startFullMazeExploration();
                this.startExploreMazeButton.disabled = true;
                this.mazeSelectCombo.disabled = true;
                this.mazeSelectButton.disabled = true;
            };
        }

        //Stop full maze exploration
        let stopExploreMazeButton:HTMLButtonElement = DomUtil.getButton(STOP_EXPLORE_MAZE_BUTTON);
        if(stopExploreMazeButton !== null){
            stopExploreMazeButton.onclick = event => {
                this.agentController.stopFullMazeExploration();
            };
        }

        //Stop full maze exploration
        let resetAgentButton:HTMLButtonElement = DomUtil.getButton(RESET_AGENT_BUTTON);
        if(resetAgentButton !== null){
            resetAgentButton.onclick = event => {
                //Clear the learnt information
                this.agent.clearLearning();

                //Recalculate and replot intelligence
                document.dispatchEvent(new CustomEvent('UpdateIntelligence'));

                Logger.info("Agent learning reset")
            };
        }

        //Clears the highlighted point on the CI graph explaining calculation of fluid intelligence
        let clearGraphSelectionButton:HTMLButtonElement = DomUtil.getButton(CLEAR_GRAPH_SELECTION_BUTTON);
        if(clearGraphSelectionButton !== null){
            clearGraphSelectionButton.onclick = event => {
                this.plotter.ciClickX = 0;
                this.plotter.plot();
            };
        }
    }


    /** Invokes draw methods for maze and agent */
    draw(){
        this.mazeManager.getCurrent().draw();
        this.agent.draw();
    }


    /** Converts the sensory data into text */
    getSensorText(sensorNumber:number):string{
        if(sensorNumber === NULL)
            return "null";
        if(sensorNumber === EMPTY)
            return "empty";
        if(sensorNumber === WALL)
            return "wall";
        if(sensorNumber === REWARD)
            return "reward";

        throw ("Sensor number not recognized");
    }


    /** Returns true if at least one maze has been selected in the
     *  maze selection modal.
     */
    mazeSelected():boolean{
        //Get the check boxes
        const mazeCheckBoxes = document.querySelectorAll("#" + MODAL_MAZE_LIST + " input");
        for (let i = 0; i < mazeCheckBoxes.length; ++i) {
            let checkBox: HTMLInputElement = <HTMLInputElement>mazeCheckBoxes[i];
            if (checkBox.checked) {
                return true;
            }
        }
        //If we have reached this point, then no maze check boxes have been selected
        return false;
    }


    /** User can select which mazes they want to use for the analysis
     *  This method updates the selection after this has been made by user.
     */
    updateMazeSelection() {
        //Reference to data select drop down
        const mazeSelectCombo: HTMLSelectElement = DomUtil.getSelect(MAZE_SELECT_COMBO);

        //Clear list of mazes
        mazeSelectCombo.options.length = 0;

        //Get the check boxes
        const mazeCheckBoxes = document.querySelectorAll("#" + MODAL_MAZE_LIST + " input");
        if (mazeCheckBoxes.length !== mazeMaps.length)//Check box length should match number of mazes
            throw "Number of maze check boxes does not match number of mazes";

        //Object storing maze ids
        let mazeIds: MazeIds = {};

        //Add set to data sets used for analysis
        let ctr: number = 0;
        for (let i = 0; i < mazeCheckBoxes.length; ++i) {
            let checkBox: HTMLInputElement = <HTMLInputElement>mazeCheckBoxes[i];
            if (checkBox.checked) {
                //Add to object with maze ids
                mazeIds[checkBox.value] = true;

                //Add name of maze to drop down
                mazeSelectCombo.options[ctr] = new Option(mazeMaps[i].name, mazeMaps[i].id.toString());

                //Increase counter
                ++ctr;
            }
        }

        //Update the maze manager with the list of maze ids
        this.mazeManager.setMazes(mazeIds);

        //Load the currently selected maze into maze manager
        this.mazeManager.load( this.mazeSelectCombo.value );

        //Load up the new maze into the agent
        this.agent.setMaze(this.mazeManager.getCurrent());

        //Let other classes know that maze selection has changed
        this.plotter.mazeSelectionChanged();

        //Reset timer if we are measuring performance
        Timer.reset();

        //Redraw
        this.draw();
    }

}

