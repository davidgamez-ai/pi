//Collection of functions for handling probability calculations
import {EMPTY, REWARD, WALL} from "./Globals.js";
import {State, StateTransitionMap, ProbDist, StateDist, StateProbMap} from "./DataTypes.js";
import * as Util from "./Util.js";
import {DEBUG_PROBABILITY} from "./Debug.js";

/** Calculates the Kulback-Liebler divergence between the two distributions
 * @param {ProbDist} P
 * @param {ProbDist} Q
 * @param {number} decimals
 * @returns {number}
 */
export function kLDivergence(P: ProbDist, Q: ProbDist, decimals?: number) : number{
    //Check that both probability distributions are valid
    checkDistributions([P, Q], decimals);

    //Stores final result
    let klDiv: number = 0;

    //Work through all values in P
    for(let x in P){
        //Check that this value of x is defined in Q.
        // If not will just add zero to final result
        if(Q[x] !== undefined){
            klDiv += P[x] * Math.log2(P[x] / Q[x]);
        }
    }
    return klDiv;
}


/* Compare and sum the probability distributions for each sensor
   Hellinger distance is 1 when there is a perfect mismatch, so use 1-Hellinger distance
   to get the degree of match between two probability distributions */
export function totalMatch(stateDist1:StateDist, stateDist2:StateDist):number{
    let matchTot:number = 0;
    matchTot += 1-hellingerDistance(stateDist1.s1, stateDist2.s1);
    matchTot += 1-hellingerDistance(stateDist1.s2, stateDist2.s2);
    matchTot += 1-hellingerDistance(stateDist1.s3, stateDist2.s3);
    matchTot += 1-hellingerDistance(stateDist1.s4, stateDist2.s4);
   //if(DEBUG_PROBABILITY) console.log("PROBABILITY. HellingerDistance. 1.s1: " + JSON.stringify(stateDist1.s1) + "; 2.s1: " + JSON.stringify(stateDist2.s1) + "; 1-HD: " + ( 1-hellingerDistance(stateDist1.s1, stateDist2.s1) ) );

    return matchTot;
}


/** Returns the Hellinger distance between two probability distributions. */
export function hellingerDistance(P: ProbDist, Q: ProbDist, decimalPlaces?: number): number{
    //Check that both probability distributions are valid
    checkDistributions([P, Q], decimalPlaces);

    //Stores the final result
    let sum: number = 0;

    //Work through all values in P
    for(let x in P){
        //If this value of x is not defined in Q, it has zero probability
        if(Q[x] === undefined){
            sum += P[x];
        }
        else{
            sum += Math.pow(Math.sqrt(P[x]) - Math.sqrt(Q[x]), 2);
        }
    }

    //Work through all values in Q and add up the ones that we have not counted already
    //These values will have zero probability in P
    for(let x in Q) {
        //If this value of x is not defined in P, it has zero probability in P
        if (P[x] === undefined) {
            sum += Q[x];
        }
    }

    //Work out final result
    let result: number = Math.pow(2, -0.5) * Math.sqrt(sum);
    return result;
}


/** Checks that the probabilities in the distributions add up to 1.
  * @param {Array<ProbDist>} distArr
 * @param {number} decimals
 */
export function checkDistributions(distArr: Array<ProbDist>, decimalPlaces?: number){
    distArr.forEach( dist => {
        let probSum:number = sumProbs(dist, decimalPlaces)
        if(Util.round(probSum, 5)!= 1)
            throw "The total probability sum of P is " + probSum;
    });
}


/** Multiplies two probability distributions together and returns the result
    The keys are sequential integers*/
export function multiplyDistributions(X: ProbDist, Y: ProbDist, decimals?: number): ProbDist{
    let newProbDist: ProbDist = {};

    for(let x in X) {//Work through first distribution
        for(let y in Y){//Work through second distribution
            let key = "p(" + x + "," + y + ")";
            newProbDist[key] = X[x] * Y[y];
        }
    };
    return newProbDist;
}


/** Displays distribution on command line */
export function printDistribution(X: ProbDist){
    for(let x in X) {//Work through distribution
        console.log(x + ":" + X[x] );
    }
}


/** Sums the probabilities in a distribution */
export function sumProbs(X: ProbDist, decimalPlaces?: number) : number{
    let probSum:number = 0;
    for(let key in X){
        probSum += X[key];
    }

    //Round to decimal places if specified
    if(decimalPlaces !== undefined){
        probSum = Util.round(probSum, decimalPlaces);
    }
    return probSum;
}


/** Converts the arrays of subsequent states into probability distributions */
export function getProbabilityDistributions(stateTransitionMap:StateTransitionMap):StateProbMap {
    //console.log("GEt prob dists " + JSON.stringify(refStateTransitionMap));

    //Create new empty state probability map
    let stateProbMap: StateProbMap = {};

    //Work through each state transition in the maze
    for (let smKey in stateTransitionMap) {
        let sArray: Array<State> = stateTransitionMap[smKey];//Local reference to array

        //Holds counts of the occurrence of ech state in array
        let stateCount: StateDist = Util.newStateDist(0);

        //Probability distributions of predictions about next state.
        let stateProbs: StateDist = Util.newStateDist(0);

        //Count how many times each state occurs for each sensor
        for (let state of sArray) {//Work through the states
            for (let sKey in stateCount) {//Work through s1, s2, etc.
                if (state[sKey] === EMPTY)
                    stateCount[sKey].e++;
                if (state[sKey] === WALL)
                    stateCount[sKey].w++;
                if (state[sKey] === REWARD)
                    stateCount[sKey].r++;
            }
        }

        //Convert the counts into to probability distribution
        for (let sKey in stateCount) {
            let sum: number = stateCount[sKey].e + stateCount[sKey].w + stateCount[sKey].r;

            //If we don't have any predicted states, then they are all equally probable
            if (sum === 0) {
                stateProbs[sKey].e = 1 / 3;
                stateProbs[sKey].w = 1 / 3;
                stateProbs[sKey].r = 1 / 3;
            }
            else {//Otherwise divide by the total to get the probability
                stateProbs[sKey].e = stateCount[sKey].e / sum;
                stateProbs[sKey].w = stateCount[sKey].w / sum;
                stateProbs[sKey].r = stateCount[sKey].r / sum;
            }
        }

        //Store the probability distribution
        stateProbMap[smKey] = stateProbs;
    }

    if (DEBUG_PROBABILITY) {
        console.log("PROBABILITY. -------- State Transition Map --------");
        console.log(JSON.stringify(stateTransitionMap));
        console.log("PROBABILITY. -------- State Probability Map --------");
        console.log(JSON.stringify(stateProbMap));
    }

    return stateProbMap;
}