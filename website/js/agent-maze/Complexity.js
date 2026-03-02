import { DEBUG_COMPLEXITY } from "./Debug.js";
import * as Util from "./Util.js";
import { MAZE_COMPLEXITY_CANVAS, PREDICTION_COMPLEXITY_CANVAS } from "./Globals.js";
/** Handles the complexity components of the algorithm */
export class Complexity {
    //Canvases for calculation of complexity using image compression
    predictionComplexityCanvas;
    mazeComplexityCanvas;
    //Compression levels for image compression
    maxCompressionLevel = 1;
    minCompressionLevel = 0.1;
    //Maze manager
    mazeManager;
    constructor(mazeManager) {
        //Store reference to maze manager.
        this.mazeManager = mazeManager;
        //Store references to canvases for calculating prediction and maze complexity
        this.predictionComplexityCanvas = document.getElementById(PREDICTION_COMPLEXITY_CANVAS);
        if (this.predictionComplexityCanvas === null)
            throw "Prediction complexity canvas not found!";
        this.mazeComplexityCanvas = document.getElementById(MAZE_COMPLEXITY_CANVAS);
        if (this.mazeComplexityCanvas === null)
            throw "Prediction canvas not found!";
        /* Set up prediction complexity canvas
            x axis is the four sensors, s1-s4
            y axis is the three possible states.  */
        this.predictionComplexityCanvas.width = 4;
        this.predictionComplexityCanvas.height = 3;
        this.fillCanvas(this.predictionComplexityCanvas);
    }
    /** Uses JPEG compression to measure the compressibility of the state distribution. */
    getCompressionRatio_Image(stateDist) {
        //Get context
        let ctx = this.predictionComplexityCanvas.getContext("2d", { willReadFrequently: true });
        if (ctx === null)
            throw "Cannot get context from predictionComplexityCanvas";
        //Get pixels from canvas
        let imgData = ctx.getImageData(0, 0, this.predictionComplexityCanvas.width, this.predictionComplexityCanvas.height);
        let pixels = imgData.data;
        //Create an image with the probability distributions.
        let x = 0;
        for (let key in stateDist) {
            let y = 0;
            pixels[x + y] = stateDist[key].e * 255; //Red
            pixels[x + y + 1] = stateDist[key].e * 255; //Green
            pixels[x + y + 2] = stateDist[key].e * 255; //Blue
            pixels[x + y + 3] = 255; //Alpha
            y += 16;
            pixels[x + y] = stateDist[key].w * 255;
            pixels[x + y + 1] = stateDist[key].w * 255;
            pixels[x + y + 2] = stateDist[key].w * 255;
            pixels[x + y + 3] = 255; //Alpha
            y += 16;
            pixels[x + y] = stateDist[key].r * 255;
            pixels[x + y + 1] = stateDist[key].r * 255;
            pixels[x + y + 2] = stateDist[key].r * 255;
            pixels[x + y + 3] = 255; //Alpha
            x += 4;
        }
        //Put pixels back into canvas
        ctx.putImageData(imgData, 0, 0);
        //Get length of the data with maximum compression
        let dataURI = this.predictionComplexityCanvas.toDataURL("image/jpeg", this.maxCompressionLevel);
        let maxCompLength = dataURI.substring(dataURI.indexOf(',') + 1, dataURI.length).length;
        //Get length of the data with minimum compression
        dataURI = this.predictionComplexityCanvas.toDataURL("image/jpeg", this.minCompressionLevel);
        let minCompLength = dataURI.substring(dataURI.indexOf(',') + 1, dataURI.length).length;
        if (DEBUG_COMPLEXITY)
            console.log("COMPLEXITY. Max canvas data length " + maxCompLength + ". Min canvas data length " + minCompLength + "; ratio: " + minCompLength / maxCompLength);
        return minCompLength / maxCompLength;
    }
    /** USes LZUTF8 to measure complexity of predictions
     *  See: https://github.com/rotemdan/lzutf8.js/
     * */
    getStateDistCompressionRatio_LZUTF8(stateDist) {
        let str = Util.getStateDistComplexityString(stateDist);
        //Compress, output set to string containing compacted binary data encoded to fit in valid UTF-16 strings.
        let output = LZUTF8.compress(str, { outputEncoding: "StorageBinaryString" });
        //Run sanity check
        if (output.length > str.length)
            throw "AgentMaze:Complexity. Compressed string length should not be greater than length of original string.";
        if (DEBUG_COMPLEXITY)
            console.log("COMPLEXITY. StateDist with LZUTF8. string: " + str + "; output: " + output + "; compression ratio: " + output.length / str.length);
        return output.length / str.length;
    }
    /** Calculates the complexity of the combined mazes d
     * @param mazeIdxArr
     */
    getMazesCompressionRatio_LZUTF8(mazeIDs) {
        //Create a string describing all the mazes
        let mazeStr = "";
        for (const mazeID of mazeIDs) {
            mazeStr += Util.getMazeString(this.mazeManager.getByID(mazeID));
        }
        //Compressed representation of the combined mazes
        let compressedMazeStr = LZUTF8.compress(mazeStr);
        if (DEBUG_COMPLEXITY)
            console.log("COMBINED MAZE COMPLEXITY. Compressed length: " + compressedMazeStr.length + "; uncompressed length: " + mazeStr.length + "; ratio: " + (compressedMazeStr.length / mazeStr.length));
        //Return result
        return compressedMazeStr.length / mazeStr.length;
    }
    /** Fills canvas with some starting data for image compression calculation. */
    fillCanvas(canvas) {
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx === null)
            throw "Cannot get context from canvas";
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
/** Generates some test data */
function getTestStateDist(index) {
    let testStateDistArray = [
        {
            s1: { e: 0, w: 1, r: 0 },
            s2: { e: 0, w: 1, r: 0 },
            s3: { e: 0, w: 1, r: 0 },
            s4: { e: 0, w: 1, r: 0 },
        },
        {
            s1: { e: 0, w: 0, r: 0 },
            s2: { e: 0, w: 0, r: 0 },
            s3: { e: 0, w: 0, r: 0 },
            s4: { e: 0, w: 0, r: 0 },
        },
        {
            s1: { e: 1, w: 1, r: 1 },
            s2: { e: 1, w: 1, r: 1 },
            s3: { e: 1, w: 1, r: 1 },
            s4: { e: 1, w: 1, r: 1 },
        },
        {
            s1: { e: 0, w: 0, r: 1 },
            s2: { e: 1, w: 1, r: 1 },
            s3: { e: 1, w: 1, r: 1 },
            s4: { e: 1, w: 1, r: 1 },
        }
    ];
    return testStateDistArray[index];
}
