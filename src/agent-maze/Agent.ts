import {IntelligenceEngine} from "./IntelligenceEngine.js";
import {DEBUG_AGENT, DEBUG_PROBABILITY, DEBUG_SENSORS} from "./Debug.js";
import {Maze} from './Maze.js'
import {State, StateTransitionMap,StateProbMap,StateDist} from "./DataTypes.js";
import {NULL, UP, DOWN, LEFT, RIGHT, DEFAULT_ICALC_FREQUENCY, MAZE_CANVAS} from './Globals.js'
import * as Util from './Util.js';
import * as Prob from "./Probability.js";
import * as DomUtil from '../common/DomUtil.js';

/** Models an agent that interacts with maze environments */
export class Agent{
    //X position in maze coordinates
    x:number;

    //Y position in maze coordinates
    y:number;

    //Maze that the agent is in
    maze:Maze;

    //Number of changes that the agent has made in direction or location with learning enabled
    changeCount:number = 0;

    //Switches off the ability of the agent to trigger an intelligence update
    disableIntelligenceUpdate:boolean = false;

    //Number of changes before update of intelligence calculations
    iCalcFreq:number = DEFAULT_ICALC_FREQUENCY;

    //Measures the intelligence of the agent
    intelligenceEngine:IntelligenceEngine = <IntelligenceEngine>{};//Has to be set after constructor

    //Current sensory state of agent.
    state:State = {
        s1: NULL,
        s2: NULL,
        s3: NULL,
        s4: NULL,
        d: 0 //Pointing up to start.
    };

    //Records all the state transitions that the agent has made.
    stateTransitionMap:StateTransitionMap = {};

    //Holds the probabilities distributions for each sensor for each state
    stateProbMap:StateProbMap = {};

    //Canvas that the agent is on
    canvas:HTMLCanvasElement;

    //Colours for drawing.
    agentBorderColor:string = "rgb(0, 0, 0)";
    agentFillColor:string = "rgb(0, 255, 0)";
    agentDirectionColor:string =  "rgb(255, 150, 255)";
    sensorBackgroundColor:string =  "rgb(0, 0, 255)";
    sensorTextColor:string =  "rgb(255, 255, 255)";

    //Controls whether the agent learns as it explores its environment
    learning:boolean = true;


    constructor(maze:Maze){
        this.setMaze(maze);
        this.canvas = DomUtil.getCanvas(MAZE_CANVAS);
    }


    /** Deletes everything that the agent has learnt */
    clearLearning(){
        this.stateTransitionMap = {};
        this.stateProbMap = {};
        this.changeCount = 0;
    }


    /** Sets position of agent without updating predictions or probabilities.
     * @param x
     * @param y
     */
    setLocation(x:number, y:number):void{
        if(this.maze.isWall(x,y))
            throw 'AGENT. Cannot set position (' + x + ',' + y + '). It is a wall';//Can't move into wall

        //Set new location
        this.x = x;
        this.y = y;

        //Update sensors to reflect change
        this.updateSensors();
        if(DEBUG_AGENT) console.log("AGENT. Set Agent Position: x:" + x + "; y: " + y);
    }


    /** Sets direction that agent is pointing in without updating predictions or probabilities
     * @param d
     */
    setDirection(d:number):void{
        if(DEBUG_AGENT) console.log("AGENT. setDirection(). current d: " + this.state.d + "; new d: " + d);

        //Ignore if the direction is the same as the current one
        if(d === this.state.d)
            return;

        //Check direction is valid
        if(d !==0 && d !== 90 && d !== 180 && d !== 270)
            throw "Invalid direction: " + d;

        //Set the direction
        this.state.d = d;

        //Update the sensors to reflect change
        this.updateSensors();
        if(DEBUG_AGENT) console.log("AGENT. New agent direction: d:" + d);
    }


    /** Sets direction that agent is pointing in.
     * Updates probabilities if learning is enabled.
     * @param d
     */
    rotate(d:number):void{
        if(DEBUG_AGENT) console.log("AGENT. rotate(). current d: " + this.state.d + "; new d: " + d);

        //Get key for change in direction
        let directionChangeKey = Util.getDirectionChangeKey(this.state, d);

        //Ignore if the direction is the same as the current one
        if(d === this.state.d)
            return;

        //Check direction is valid
        if(d !==0 && d !== 90 && d !== 180 && d !== 270)
            throw "Invalid direction: " + d;

        //Set the direction
        this.state.d = d;

        //Update the sensors to reflect change
        this.updateSensors();
        if(DEBUG_AGENT) console.log("AGENT. New agent direction: d:" + d);

        if(this.learning) {
            this.updateProbabilities(directionChangeKey);
        }

        //Keep track of number of changes for intelligence update
        if(!this.disableIntelligenceUpdate)
            this.changeCount++;

        //Recalculate intelligence
        if(!this.disableIntelligenceUpdate && (this.changeCount % this.iCalcFreq === 0 )) {
            document.dispatchEvent(new CustomEvent('UpdateIntelligence'));
        }
    }


    /** Moves agent one square in the current direction if this is possible
     * @param calculateProbs
     */
    move():void{
        if(DEBUG_AGENT) console.log("AGENT. move(). current x: " + this.x + "; current y: " + this.y);

        //Get stateTransitionKey for current state - need an appropriate stateTransitionKey for a planned movement
        let stateTransitionKey = Util.getMovementKey(this.state);

        //Carry out movement
        let moved:boolean = false;
        if(this.state.d === UP){
            if(this.y > 0 && !this.maze.isWall(this.x, this.y-1)) {
                --this.y;
                moved = true;
            }
        }
        else if (this.state.d === DOWN){
            if(this.y < this.maze.height-1 && !this.maze.isWall(this.x, this.y+1)) {
                ++this.y;
                moved = true;
            }
        }
        else if (this.state.d === LEFT){
            if(this.x > 0 && !this.maze.isWall(this.x-1, this.y)) {
                --this.x;
                moved = true;
            }
        }
        else if (this.state.d === RIGHT){
            if(this.x < this.maze.width-1 && !this.maze.isWall(this.x+1, this.y)) {
                ++this.x;
                moved = true;
            }
        }
        else
            throw "Direction not recognized.";

        //Update the sensors
        this.updateSensors();
        if(DEBUG_AGENT) console.log("AGENT. move(). Move status: " + moved + "; new x: " + this.x + "; new y: " + this.y);

        //Keep track of number of changes for intelligence update
        if(!this.disableIntelligenceUpdate)
            this.changeCount++;

        //Update agent's representation of the probability distributions in its environment.
        if(this.learning) {
            this.updateProbabilities(stateTransitionKey);
        }

        //Recalculate intelligence
        if( !this.disableIntelligenceUpdate && ( this.changeCount % this.iCalcFreq === 0 ) ){
            document.dispatchEvent(new CustomEvent('UpdateIntelligence'));
        }
    }


    /** Calculates the agent's model of the probability distributions of the sensory data that it
     *  predicts based on the current state and the intended movement.
     * @param changeKey
     */
    updateProbabilities(changeKey:string){
        //Add new state to state map
        if (this.stateTransitionMap[changeKey] === undefined)
            this.stateTransitionMap[changeKey] = [];
        this.stateTransitionMap[changeKey].push(this.getState());

        if(DEBUG_PROBABILITY) console.log("AGENT. Direction change. Key: " + changeKey + "' Total number of keys: " + Object.keys(this.stateTransitionMap).length + "; number of entries for this key: " + this.stateTransitionMap[changeKey].length);

        //Use the new data to update predictions
        this.stateProbMap = Prob.getProbabilityDistributions(this.stateTransitionMap);

        if(DEBUG_PROBABILITY) {
            console.log("============ State Transition Map =================")
            console.log(this.stateTransitionMap);
            console.log("-------------- State Prob Map---------------");
            console.log(this.stateProbMap);
        }
    }


    /** Draws agent on canvas */
    draw() {
        if(this.canvas === null)
            throw "Agent.draw(). Canvas not set.";

        let ctx = this.canvas.getContext("2d");
        if(ctx === null)
            throw "Agent.draw(). Context is null.";

        let size = this.maze.gridSize;
        let startX = this.x * size;
        let startY = this.y * size;

        if (DEBUG_AGENT) console.log("AGENT: draw(). x: " + this.x + "; y: " + this.y + "; startX: " + startX + "; startY: " + startY);

        //Save state of canvas so agent actions do not affect other drawing operations.
        ctx.save();

        //Move to square where agent is
        ctx.translate(startX + size / 2, startY + size / 2);

        //Shift context around to point in correct direction
        ctx.rotate(this.state.d * Math.PI / 180);

        //Draw circle around agent
        ctx.fillStyle = this.agentFillColor;
        ctx.strokeStyle = this.agentBorderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size / 3,  0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        //Draw triangle to indicate which direction agent is facing
        ctx.lineWidth = 1;
        ctx.fillStyle = this.agentDirectionColor;
        ctx.beginPath();
        ctx.moveTo(0, -size/4);
        ctx.lineTo(size/4, 0);
        ctx.lineTo(-size/4, 0);
        ctx.lineTo(0, -size/4);
        ctx.stroke();
        ctx.fill();

        //Draw the four sensors
        this.drawSensor(ctx,"S4", size/15, size/15);

        ctx.translate( -1 * size / 3, 0);
        this.drawSensor(ctx,"S1", size/15, size/15);

        ctx.translate( size / 3, -1 * size / 3);
        this.drawSensor(ctx,"S2", size/15, size/15);

        ctx.translate( size / 3, size / 3);
        this.drawSensor(ctx,"S3", size/15, size/15);

        //Reset state of canvas
        ctx.restore();
    }


    /** Draws a sensor with the specified label */
    drawSensor(ctx:any, label:string, size:number, fontSize:number){
        ctx.save();

        ctx.fillStyle = this.sensorBackgroundColor;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, 2 * Math.PI);
        ctx.fill();

        ctx.translate( -1 * fontSize/2, 1 * fontSize/4);

        ctx.font = fontSize + "px Arial";
        ctx.fillStyle = this.sensorTextColor;
        ctx.strokeStyle = this.sensorTextColor;
        ctx.fillText(label, 0, 0);
        //ctx.strokeText(label, 0, 0);

        ctx.restore();
    }


    /** Updates the sensor readings */
    updateSensors(){
        //S4 is what we are currently on - does not change with orientation
        this.state.s4 = this.maze.get(this.x, this.y);

        if(this.state.d === UP) {//Pointing upwards
            //S1 is on the left
            this.state.s1 = this.maze.get(this.x-1, this.y);
            this.state.s2 = this.maze.get(this.x, this.y-1);
            this.state.s3 = this.maze.get(this.x+1, this.y);
        }
        else if(this.state.d === DOWN) {//Pointing downwards
            //S1 is on the right
            this.state.s1 = this.maze.get(this.x+1, this.y);
            this.state.s2 = this.maze.get(this.x, this.y+1);
            this.state.s3 = this.maze.get(this.x-1, this.y);
        }
        else if(this.state.d === RIGHT) {//Pointing right
            //S1 is at the top
            this.state.s1 = this.maze.get(this.x, this.y-1);
            this.state.s2 = this.maze.get(this.x+1, this.y);
            this.state.s3 = this.maze.get(this.x, this.y+1);
        }
        else if(this.state.d === LEFT) {//Pointing left
            //S1 is at the bottom
            this.state.s1 = this.maze.get(this.x, this.y+1);
            this.state.s2 = this.maze.get(this.x-1, this.y);
            this.state.s3 = this.maze.get(this.x, this.y-1);
        }

        if(DEBUG_SENSORS) console.log("SENSORS. Location: (" + this.x + "," + this.y + "). State: " + Util.getStateMapKey(this.state));
    }


    /** Returns a copy of the agent's state */
    getState():State{
        let tmpState:State = {
            s1: this.state.s1,
            s2: this.state.s2,
            s3: this.state.s3,
            s4: this.state.s4,
            d: this.state.d
        }

        return tmpState;
    }


    /** Returns a prediction about the next state in the form of a probability distribution. */
    getPrediction(stateKey:string):StateDist{
        if(this.stateProbMap[stateKey] === undefined){
            return Util.newStateDist(1/3);
        }
        return this.stateProbMap[stateKey];
    }


    /** Enables or disables the learning */
    setLearning(learning:boolean){
        this.learning = learning;
    }


    /** Injects a reference to the intelligence engine */
    setIntelligenceEngine(intelligenceEngine:IntelligenceEngine):void{
        this.intelligenceEngine = intelligenceEngine;
    }

    setMaze(maze:Maze):void{
        //Store reference to maze
        this.maze = maze;

        //Set agent location to start position for maze
        this.setLocation(maze.getStartX(), maze.getStartY());

        //Set agent direction to start direction for maze
        this.setDirection(maze.getStartD());
    }

}