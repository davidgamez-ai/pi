import { DEBUG_MAZE } from "./Debug.js";
import { EMPTY, WALL, REWARD, MAZE_CANVAS } from "./Globals.js";
import * as DomUtil from '../common/DomUtil.js';
/** Models and draws a maze environment */
export class Maze {
    //The layout of the maze
    mazeMap; //Only assigned when maze is loaded
    //Canvas where maze is being drawn
    canvas;
    //Context of the canvas
    ctx;
    //Width and height of maze in maze coordinates
    width = 0;
    height = 0;
    //Size to draw each grid square of maze
    gridSize = 0;
    //Colours of graphic elements
    wallColor = "rgb(0, 0, 0)";
    gridColor = "rgb(100, 100, 100)";
    rewardColor = "rgb(255, 0, 0)";
    backgroundColor = "rgb(255, 255, 255)";
    constructor(mazeMap) {
        //Store canvas details
        this.canvas = DomUtil.getCanvas(MAZE_CANVAS);
        this.ctx = this.canvas.getContext("2d");
        //Store maze map
        this.mazeMap = mazeMap;
        //Set width and height
        this.width = this.mazeMap.rows[0].length;
        this.height = this.mazeMap.rows.length;
        //Grid size
        this.gridSize = this.canvas.width / this.mazeMap.rows.length;
        if (DEBUG_MAZE)
            console.log("MAZE. ID: " + this.mazeMap.id + "; Canvas: (" + this.canvas.width + ", " + this.canvas.height + "). Grid size: " + this.gridSize);
        if (DEBUG_MAZE)
            console.log(`Maze width ${this.width}; height: ${this.height}`);
    }
    /** Returns what is present at this location in the maze */
    get(x, y) {
        //Return wall if the maze stops here. It is effectively a wall
        if (x > this.mazeMap.rows[0].length - 1 || y > this.mazeMap.rows.length - 1)
            return WALL;
        if (x < 0 || y < 0)
            return WALL;
        if (this.isWall(x, y))
            return WALL;
        if (this.isReward(x, y))
            return REWARD;
        if (this.isEmpty(x, y))
            return EMPTY;
        throw ("Cannot find correct sensing information");
    }
    ;
    /** Returns ID of maze */
    getId() {
        return this.mazeMap.id;
    }
    /** Returns maze map associated with maze */
    getMazeMap() {
        return this.mazeMap;
    }
    /** Returns name of maze */
    getName() {
        return this.mazeMap.name;
    }
    /** Returns symbol associated with maze for graph plotting */
    getSymbol() {
        return this.mazeMap.symbol;
    }
    /** Returns starting X position of agent in maze **/
    getStartX() {
        return this.mazeMap.startX;
    }
    /** Returns starting Y position of agent in maze */
    getStartY() {
        return this.mazeMap.startY;
    }
    /** Returns start direction of agent in maze */
    getStartD() {
        return this.mazeMap.startD;
    }
    /** Returns true if this location is a wall */
    isWall(x, y) {
        //Check that agent position is not a wall
        if (this.mazeMap.rows[y][x] === WALL)
            return true;
        return false;
    }
    /** Returns true if this location is a reward */
    isReward(x, y) {
        //Check that agent position is not a wall
        if (this.mazeMap.rows[y][x] === REWARD)
            return true;
        return false;
    }
    /** Returns true if this location is empty. */
    isEmpty(x, y) {
        //Check that agent position is not a wall
        if (this.mazeMap.rows[y][x] === EMPTY)
            return true;
        return false;
    }
    /** Draws the maze on the canvas. */
    draw() {
        this.clearCanvas();
        if (this.ctx === null)
            throw "Canvas context cannot be found.";
        //Save state of canvas
        this.ctx.save();
        for (let y = 0; y < this.mazeMap.rows.length; ++y) {
            for (let x = 0; x < this.mazeMap.rows[y].length; ++x) {
                let tmpX = x * this.gridSize;
                let tmpY = y * this.gridSize;
                //Draw background grid
                this.drawMazeBackground(this.ctx, tmpX, tmpY);
                if (this.mazeMap.rows[y][x] === WALL)
                    this.drawMazeBlock(this.ctx, tmpX, tmpY);
                else if (this.mazeMap.rows[y][x] === REWARD)
                    this.drawReward(this.ctx, tmpX, tmpY);
            }
        }
        //Restore state of canvas
        this.ctx.restore();
    }
    /** Clears canvas in preparation for drawing */
    clearCanvas() {
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /** Draws maze background */
    drawMazeBackground(ctx, x, y) {
        if (DEBUG_MAZE)
            console.log("Maze background: x: " + x + "; y: " + y + "; w/h: " + this.gridSize);
        ctx.beginPath();
        ctx.lineWidth = "1";
        ctx.strokeStyle = this.gridColor;
        ctx.rect(x, y, this.gridSize, this.gridSize);
        ctx.stroke();
    }
    /** Draws a block of the maze */
    drawMazeBlock(ctx, x, y) {
        if (DEBUG_MAZE)
            console.log("Maze block: x: " + x + "; y: " + y + "; w/h: " + this.gridSize);
        ctx.fillStyle = this.wallColor;
        ctx.fillRect(x, y, this.gridSize, this.gridSize);
    }
    /** Draws a reward */
    drawReward(ctx, x, y) {
        ctx.fillStyle = this.rewardColor;
        ctx.beginPath();
        ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}
