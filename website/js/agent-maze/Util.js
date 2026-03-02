import { DEBUG_UTIL } from "./Debug.js";
import { WALL, EMPTY, REWARD } from "./Globals.js";
/** Generates string representation of a state of the agent's sensors. */
export function getStateMapKey(state) {
    let key = "(" + state.s1 + "," + state.s2 + "," + state.s3 + "," + state.s4 + "," + state.d + ")";
    return key;
}
/** Generates string representation of a location and direction of the agent */
export function getPIMapKey(x, y, d) {
    let key = "(" + x + "," + y + "," + d + ")";
    return key;
}
/** Generates string representation of a change in direction for agent */
export function getDirectionChangeKey(state, newDirection) {
    let key = "state: (" + state.s1 + "," + state.s2 + "," + state.s3 + "," + state.s4 + "," + state.d + "), newDirection: " + newDirection;
    return key;
}
/** Generates string representation of a movement of the agent */
export function getMovementKey(state) {
    let key = "state: (" + state.s1 + "," + state.s2 + "," + state.s3 + "," + state.s4 + "," + state.d + "), move";
    return key;
}
/** Returns a string representation of the state distribution.
 *  Each number is converted to the range 0-9 */
export function getStateDistComplexityString(stateDist) {
    let str = "";
    for (let sensorKey in stateDist) {
        str += round(stateDist[sensorKey].e * 9, 0);
        str += round(stateDist[sensorKey].w * 9, 0);
        str += round(stateDist[sensorKey].r * 9, 0);
    }
    if (DEBUG_UTIL)
        console.log("UTIL. getStateDistComplexityString(). Compression string: " + str);
    return str;
}
/** Returns a string representation of one or more mazes. */
export function getMazeString(maze) {
    let str = "";
    //Build a string representation of the topology of the maze - no need to include name, startX, etc.
    for (let y = 0; y < maze.getMazeMap().rows.length; ++y) {
        for (let x = 0; x < maze.getMazeMap().rows[y].length; ++x) {
            //Add the value to the string.
            str += maze.getMazeMap().rows[y][x];
        }
    }
    if (DEBUG_UTIL)
        console.log("UTIL. Maze string: " + str);
    return str;
}
/** Converts a state to a state distribution */
export function stateToStateDist(state) {
    //Get state distribution initialized to zero
    let stateDist = newStateDist(0.0);
    //Set keys to appropriate values
    let keys = ["s1", "s2", "s3", "s4"]; //Easy way to ignore d
    for (let key of keys) { //Work through s1, s2, etc.
        if (state[key] === EMPTY)
            stateDist[key].e = 1.0;
        else if (state[key] === WALL)
            stateDist[key].w = 1.0;
        else if (state[key] === REWARD)
            stateDist[key].r = 1.0;
    }
    if (DEBUG_UTIL)
        console.log("DEBUG. Converting State to StateDist. State: " + JSON.stringify(state) + "; StateDist: " + JSON.stringify(stateDist));
    return stateDist;
}
/** Returns an initialized state data structure. */
export function newStateDist(defaultVal) {
    return {
        s1: { e: defaultVal, w: defaultVal, r: defaultVal },
        s2: { e: defaultVal, w: defaultVal, r: defaultVal },
        s3: { e: defaultVal, w: defaultVal, r: defaultVal },
        s4: { e: defaultVal, w: defaultVal, r: defaultVal }
    };
}
/** Rounds number to specified number of decimal places. */
export function round(value, decimals) {
    let factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
/** Uses the polynomial specified in the terms argument to calculate the value
 * of y for the given value of x.
 * @param terms
 * @param x
 */
export function calculatePolynomialResult(terms, x) {
    let result = 0;
    for (let i = 0; i < terms.length; ++i) {
        if (i === 0) {
            result += terms[i];
        }
        else {
            result += terms[i] * Math.pow(x, i);
        }
    }
    return result;
}
/** Calculates differential of polynomial to get the slope */
export function getSlope(terms, x) {
    //First differentiate the terms
    let differential = [];
    for (let i = 1; i < terms.length; ++i) { //Ignore first entry, which disappears in the differential
        if (i === 1) {
            differential.push(terms[i]);
        }
        else {
            differential.push(i * terms[i]);
        }
    }
    if (DEBUG_UTIL)
        console.log("UTIL. Differential terms: " + JSON.stringify(differential));
    //Use the terms to calculate the slope and return it
    let slope = calculatePolynomialResult(differential, x);
    if (DEBUG_UTIL)
        console.log("UTIL. Slope: " + slope);
    return slope;
}
/** Returns random integer */
export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
/** Returns true if two states are identical */
export function stateMatch(state1, state2) {
    if (state1.d !== state2.d)
        return false;
    if (state1.s1 !== state2.s1)
        return false;
    if (state1.s2 !== state2.s2)
        return false;
    if (state1.s3 !== state2.s3)
        return false;
    if (state1.s4 !== state2.s4)
        return false;
    return true;
}
