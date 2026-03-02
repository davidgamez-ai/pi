import { DEBUG_AGENT_CONTROLLER, DEBUG_INTELLIGENCE, MEASURE_PERFORMANCE } from "./Debug.js";
import * as Util from './Util.js';
import { Logger } from "./Logger.js";
import { Timer } from "../common/Timer.js";
/** Programmatically controls the agent. For example, exploring and mapping the maze. */
export class AgentController {
    //The agent that is being controlled
    agent;
    //Manager handing mazes
    mazeManager;
    //Engine for intelligence calculations
    iEngine;
    //Handles complexity calculations
    complexity;
    //Stores starting point when agent begins exploring
    startX = 0;
    startY = 0;
    startD = 0;
    //Variables for maze exploration
    xCounter = 0;
    yCounter = 0;
    dStartCounter = 0;
    dEndCounter = 0;
    resetDirection = true;
    resetLocation = true;
    //Tracks the number of exploratory transitions for debugging.
    exploreCtr = 0;
    //Allows a delay between movements.
    timer;
    //Interval between movements when agent is exploring maze
    stateIntervalTime = 100;
    //Starts/stops full maze exploration.
    fullMazeExploration = false;
    /** Records all of the state transitions that the agent has made.
        The index refers to the maze topology that we are on. */
    refStateTransitionMapArray = [];
    //Timestamp used to mark measures of intelligence
    timeStamp = 0;
    constructor(agent, mazeManager, iEngine, complexity) {
        this.agent = agent;
        this.mazeManager = mazeManager;
        this.iEngine = iEngine;
        this.complexity = complexity;
    }
    /** Moves agent through every location and direction in each maze with learning disabled.
     *  For each change of direction and location it measures the distance between the predictions
     *  made by the agent and what actually happens.
     */
    measureIntelligence() {
        Logger.info("Start measuring intelligence.");
        if (MEASURE_PERFORMANCE)
            Timer.start();
        //Record starting state of agent and maze
        this.startX = this.agent.x;
        this.startY = this.agent.y;
        this.startD = this.agent.state.d;
        let startAgentLearning = this.agent.learning;
        //Switch off learning and disable ability of agent to trigger intelligence measurements
        this.agent.learning = false;
        this.agent.disableIntelligenceUpdate = true;
        //Stores total transitions across all mazes
        let totTransCnt = 0;
        //Work through all selected mazes
        for (let mazeIdx = 0; mazeIdx < this.mazeManager.size(); ++mazeIdx) {
            //Keeps track of the number of transitions per maze
            let transitionCount = 0;
            //Get reference to maze
            const maze = this.mazeManager.getByIndex(mazeIdx);
            if (DEBUG_INTELLIGENCE)
                console.log(`Calculating intelligence for maze ${maze.getId()}`);
            //Set maze in agent
            this.agent.setMaze(maze);
            //Work through every cell in the maze
            for (let y = 0; y < maze.height; ++y) {
                for (let x = 0; x < maze.width; ++x) {
                    //If it is an empty cell or reward - agent can't occupy wall cells
                    if (maze.isEmpty(x, y) || maze.isReward(x, y)) {
                        //Put agent in cell
                        this.agent.setLocation(x, y);
                        //Work through the four different starting directions
                        for (let startD = 0; startD < 360; startD += 90) {
                            //Point agent in starting direction
                            this.agent.setDirection(startD);
                            //Work through all of the direction transitions
                            for (let endD = 0; endD < 360; endD += 90) {
                                if (startD !== endD) {
                                    //Convert current state of agent to key
                                    let key = Util.getDirectionChangeKey(this.agent.state, endD);
                                    //Get prediction from agent
                                    let prediction = this.agent.getPrediction(key);
                                    //Rotate agent from start direction to end direction
                                    this.agent.rotate(endD);
                                    ++transitionCount;
                                    //Get new state and convert to probability distribution
                                    let agentState = this.agent.getState();
                                    let actual = Util.stateToStateDist(agentState);
                                    //Calculate and store intelligence match for this state
                                    let [predMatch, maxMatch] = this.iEngine.getMatch(prediction, actual);
                                    if (predMatch > maxMatch)
                                        throw "ERROR: Prediction cannot match better than what actually happened.";
                                    //Get compressibility of the prediction and of the actual distribution
                                    let predComp = this.complexity.getStateDistCompressionRatio_LZUTF8(prediction);
                                    let actualComp = this.complexity.getStateDistCompressionRatio_LZUTF8(actual);
                                    //Store record of intellgence distance
                                    const iMeasure = { predMatch: predMatch, predCompress: predComp, maxMatch: maxMatch, actualCompress: actualComp };
                                    this.iEngine.addMeasurement(this.timeStamp, maze.getId(), iMeasure);
                                    //Reset direction of agent
                                    this.agent.setDirection(startD);
                                    if (DEBUG_AGENT_CONTROLLER)
                                        console.log("AGENT_CONTROLLER. Location: (" + x + ", " + y + "). Direction change. startD: " + startD + "; endD: " + endD);
                                }
                            }
                            //Try moving in each different direction
                            //Convert current state of agent to key
                            let key = Util.getMovementKey(this.agent.state);
                            //Get prediction from agent
                            let prediction = this.agent.getPrediction(key);
                            //Move in direction agent is pointing.
                            this.agent.move();
                            ++transitionCount;
                            //Get new state and convert to probability distribution across empty, wall and reward
                            let agentState = this.agent.getState();
                            let actual = Util.stateToStateDist(agentState);
                            //Calculate and store intelligence distance for this state
                            let [predMatch, maxMatch] = this.iEngine.getMatch(prediction, actual);
                            //Get compressibility of the prediction and of the actual distribution
                            let predComp = this.complexity.getStateDistCompressionRatio_LZUTF8(prediction);
                            let actualComp = this.complexity.getStateDistCompressionRatio_LZUTF8(actual);
                            //Store record of intellgence distance
                            const iMeasure = { predMatch: predMatch, predCompress: predComp, maxMatch: maxMatch, actualCompress: actualComp };
                            this.iEngine.addMeasurement(this.timeStamp, maze.getId(), iMeasure);
                            //Move agent back to where it was
                            this.agent.setLocation(x, y);
                            if (DEBUG_AGENT_CONTROLLER)
                                console.log("AGENT_CONTROLLER. Move. Location: (" + x + ", " + y + "). Direction: " + startD);
                        }
                    }
                }
            }
            //Mapping of this maze complete
            if (DEBUG_AGENT_CONTROLLER)
                console.log("AGENT_CONTROLLER. Maze mapping complete for " + maze.getName() + ". Number of transitions: " + transitionCount);
            //Output transition count when measuring performance.
            if (MEASURE_PERFORMANCE)
                console.log(`Maze: ${maze.getName()}. Number of actions: ${transitionCount}.`);
            //Double-check the records
            if (this.iEngine.getMeasurementCount(this.timeStamp, maze.getId()) != transitionCount)
                throw "PM record length for this maze does not match number of transitions. pmArray length: " + this.iEngine.getMeasurementCount(this.timeStamp, maze.getId()) + "; transition count: " + transitionCount;
            totTransCnt += transitionCount;
        }
        //Recalculate intelligence for this time stamp
        this.iEngine.updateIntelligence(this.timeStamp);
        //End timer and print result as well as mean
        if (MEASURE_PERFORMANCE) {
            Timer.end("MazeAgent", true);
            console.log(`AgentMaze. Total number of transitions: ${totTransCnt}.`);
        }
        //Increase timestamp
        ++this.timeStamp;
        //Reset agent to start state
        this.agent.setMaze(this.mazeManager.getCurrent());
        this.agent.setLocation(this.startX, this.startY);
        this.agent.setDirection(this.startD);
        this.agent.learning = startAgentLearning;
        this.agent.disableIntelligenceUpdate = false;
        //Draw maze and agent.
        this.mazeManager.getCurrent().draw();
        this.agent.draw();
        if (DEBUG_INTELLIGENCE)
            Logger.info("Intelligence measurement complete. " + totTransCnt + " transitions.");
    }
    /** Starts complete exploration of all of the possible state transitions in the maze. */
    startFullMazeExploration() {
        if (DEBUG_AGENT_CONTROLLER)
            console.log("AGENT_CONTROLLER. Starting maze exploration.");
        this.fullMazeExploration = true;
        //Set up the counters
        this.xCounter = -1; //Will be incremented to zero when explore function is first called
        this.yCounter = 0;
        this.dStartCounter = 270; //Trigger movement first time explore function is called.
        this.dEndCounter = 270; //Trigger movement first time explore function is called.
        this.resetDirection = false;
        this.resetLocation = false;
        this.exploreCtr = 0;
        //Move again after a time interval
        this.timer = setInterval(this.exploreMaze, this.stateIntervalTime, this);
    }
    /** Stops maze exploration */
    stopFullMazeExploration() {
        this.fullMazeExploration = false;
        clearTimeout(this.timer);
        if (DEBUG_AGENT_CONTROLLER)
            console.log("AGENT_CONTROLLER. Full maze exploration stopped. Number of transitions: " + this.exploreCtr);
        const event = new CustomEvent('FullMazeExplorationStopped');
        document.dispatchEvent(event);
    }
    /** Called by the timer to explore the next part of the maze */
    exploreMaze(agCon) {
        if (DEBUG_AGENT_CONTROLLER)
            console.log("AGENT_CONTROLLER. Exploring maze: explore counter: " + agCon.exploreCtr);
        //Get reference to maze
        const maze = agCon.getCurrentMaze();
        //Have we just explored a direction transition and need to reset agent
        if (agCon.resetDirection === true) {
            if (DEBUG_AGENT_CONTROLLER)
                console.log("AGENT_CONTROLLER. Reset direction: x: " + agCon.xCounter + "; y: " + agCon.yCounter + "; dStart: " + agCon.dStartCounter + "; dEnd: " + agCon.dEndCounter);
            //Reset direction without probability update
            agCon.agent.setDirection(agCon.dStartCounter);
            //Mark as false because we have completed this step
            agCon.resetDirection = false;
        }
        //Have we just explored a movement transition and need to reset agent to original location?
        else if (agCon.resetLocation === true) {
            if (DEBUG_AGENT_CONTROLLER)
                console.log("AGENT_CONTROLLER. Reset location: x: " + agCon.xCounter + "; y: " + agCon.yCounter + "; dStart: " + agCon.dStartCounter + "; dEnd: " + agCon.dEndCounter);
            //Reset location without probability update
            agCon.agent.setLocation(agCon.xCounter, agCon.yCounter);
            //Set dEndCounter to zero to trigger direction exploration
            agCon.dEndCounter = 0;
            //Mark as false because we have completed this step.
            agCon.resetLocation = false;
        }
        //Have we completely explored this location?
        else if (agCon.dStartCounter === 270 && agCon.dEndCounter > 270) {
            //Change location by increasing the counters
            agCon.xCounter++;
            if (agCon.xCounter === maze.width) {
                agCon.xCounter = 0;
                agCon.yCounter++;
                if (agCon.yCounter === maze.height) { //Maze exploration complete
                    agCon.stopFullMazeExploration(); //End maze exploration
                    return;
                }
            }
            //Check to see if the agent can move to cell
            if (maze.isEmpty(agCon.xCounter, agCon.yCounter) || maze.isReward(agCon.xCounter, agCon.yCounter)) {
                //Change location of agent
                if (DEBUG_AGENT_CONTROLLER)
                    console.log("AGENT_CONTROLLER. Change location: x: " + agCon.xCounter + "; y: " + agCon.yCounter + "; dStart: " + agCon.dStartCounter + "; dEnd: " + agCon.dEndCounter);
                agCon.agent.setLocation(agCon.xCounter, agCon.yCounter);
                //Reset start counter and set end counter to -1 to trigger a movement at the next call.
                agCon.dStartCounter = 0;
                agCon.dEndCounter = -1;
                //Set direction of agent to pointing straight up
                agCon.agent.setDirection(0);
            }
        }
        //Perform a movement in this direction
        else if (agCon.dEndCounter === -1) {
            if (DEBUG_AGENT_CONTROLLER)
                console.log("AGENT_CONTROLLER. Move: x: " + agCon.xCounter + "; y: " + agCon.yCounter + "; dStart: " + agCon.dStartCounter + "; dEnd: " + agCon.dEndCounter);
            //Move agent with probability update
            agCon.agent.move();
            ++agCon.exploreCtr;
            //Trigger movement back to original location
            agCon.resetLocation = true;
        }
        //Exploring state transitions at a particular location
        else if (agCon.dEndCounter >= 0 && agCon.dEndCounter <= 270) {
            //Change direction with probability update
            if (agCon.dEndCounter !== agCon.dStartCounter) {
                if (DEBUG_AGENT_CONTROLLER)
                    console.log("AGENT_CONTROLLER. Direction transition: x: " + agCon.xCounter + "; y: " + agCon.yCounter + "; dStart: " + agCon.dStartCounter + "; dEnd: " + agCon.dEndCounter);
                agCon.agent.rotate(agCon.dEndCounter);
                agCon.exploreCtr++;
                agCon.resetDirection = true;
            }
            //Explore the next direction state transition
            agCon.dEndCounter += 90;
            if (DEBUG_AGENT_CONTROLLER)
                console.log("AGENT_CONTROLLER. Incremented end counter: x: " + agCon.xCounter + "; y: " + agCon.yCounter + "; dStart: " + agCon.dStartCounter + "; dEnd(new): " + agCon.dEndCounter);
        }
        //End of direction exploration - try next direction
        else if (agCon.dEndCounter > 270) {
            agCon.dStartCounter += 90;
            agCon.dEndCounter = -1;
            if (DEBUG_AGENT_CONTROLLER)
                console.log("AGENT_CONTROLLER. Next direction: x: " + agCon.xCounter + "; y: " + agCon.yCounter + "; dStart: " + agCon.dStartCounter + "; dEnd: " + agCon.dEndCounter);
            //Set to new direction
            agCon.agent.setDirection(agCon.dStartCounter);
        }
        //Catch any problems
        else {
            throw "AGENT_CONTROLLER. Explore situation not recognized!";
        }
        //Redraw agent and maze
        maze.draw();
        agCon.agent.draw();
    }
    /** Returns the current maze */
    getCurrentMaze() {
        return this.mazeManager.getCurrent();
    }
}
