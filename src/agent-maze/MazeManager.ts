import {MazeIds} from "./DataTypes.js";
import {mazeMaps} from "./MazeMaps.js";
import {Maze} from "./Maze.js";
import {DEBUG_MAZE_MANAGER} from "./Debug.js";


/** Holds the mazes that have been selected by the user and are currently
 *  being used for the intelligence calculations
 */
export class MazeManager {
    //The current mazes
    private mazes:Maze[];

    //Index of current maze
    private mazeIndex:number;


    constructor(){
        //Validates the maze maps
        this.checkMazeMaps();

        //Load all the mazes
        this.reset();

        //Check that we have at least one maze
        if(this.mazes.length === 0)
            throw "No mazes found";

        //Initialize maze index. Index is different from id.
        this.mazeIndex = 0;
    }


    /** Returns true if a maze with this ID
     * is in the currently selected set of mazes.
     * @param mazeID
     */
    contains(mazeID:string): boolean{
        for(const maze of this.mazes) {
            if (maze.getId() === mazeID)
                return true;
        }
        return false;
    }


    /** Loads up the maze with the specified id
     * Throws an exception if the maze cannot be found
     */
    load(id:string):void{
        for(let i:number = 0; i < this.mazes.length; ++i) {
            if (id === this.mazes[i].getId()) {//Maze found
                this.mazeIndex = i;
                return;
            }
        }
        //Maze not found
        console.log(this.mazes);
        throw "MazeManager: Maze with ID " + id + " not found in current list of mazes.";
    }


    /** Returns the current number of mazes */
    size():number {
        return this.mazes.length;
    }


    /** Removes maze from list of mazes.
     * Throws an exception if the index is out of bounds
     */
    remove(index:number):void{
        if(index < 0 || index >= this.mazes.length)
            throw "MazeManager:remove: Index out of bounds: " + index;

        //Remove maze
        this.mazes.splice(index, 1);

        //Update index
        if(index === this.mazeIndex)//Deleted current maze
            this.mazeIndex = 0;

        else if(index < this.mazeIndex)//Deleted a maze below current maze
            this.mazeIndex--;
    }


    /** Returns the current maze
     * Throws an exception if maze index is out of bounds
     */
    getCurrent():Maze{
        if(this.mazeIndex < 0 || this.mazeIndex >= this.mazes.length)
            throw "MazeManager:get: Index out of bounds: " + this.mazeIndex;
        return this.mazes[this.mazeIndex];
    }


    /** Returns the maze at the specified index or throws an exception if
     * this is out of bounds
     */
    getByIndex(index:number):Maze{
        if(index < 0 || index >= this.mazes.length)
            throw "MazeManager:get: Index out of bounds: " + this.mazeIndex;
        return this.mazes[index];
    }


    /** Returns the maze with the specified ID
     * Throws an exception if ID cannot be found
     */
    getByID(mazeID:string):Maze{
        for(const maze of this.mazes) {
            if (maze.getId() === mazeID)
                return maze;
        }
        throw `MazeManager: Maze with ID: ${mazeID} cannot be found.`;
    }


    /** Returns true if a maze with this ID has been selected by user.
     *
     * @param mazeID
     */
    mazeSelected(mazeID:string):boolean{
        for (let maze of this.mazes){
            if(mazeID === maze.getId())
                return true;
        }
        return false;
    }


    /** Returns the IDs of the current mazes */
    getMazeIDs():string[]{
        const mazeIDs:string[] = [];
        for (let maze of this.mazes){
            mazeIDs.push(maze.getId());
        }
        return mazeIDs;
    }


    /** Reloads all of the maze maps */
    reset():void {
        //Load up mazes
        this.mazes = [];
        for (let mazeMap of mazeMaps)
            this.mazes.push( new Maze(mazeMap) );

        //Reset index
        this.mazeIndex = 0;
    }


    /** Sets maze selection */
    setMazes(mazeIds:MazeIds):void {
        //Resets class with full list of mazes
        this.reset();

        //Removes any mazes that are not in the array
        for(let i=0; i<this.mazes.length; ++i) {//Work through mazes
            if(mazeIds[ this.mazes[i].getId() ] === undefined) {//Maze not in object
                this.remove(i);

                //decrease i or we will skip one
                --i;
            }
        }
        if(DEBUG_MAZE_MANAGER) console.log(`Number of mazes selected: ${this.mazes.length}.`);
    }


    /** Runs some checks that mazes are correctly specified
     * #FIXME VALIDATE MAZE STRUCTURE.
     * */
    private checkMazeMaps():void{
        for(let mazeMap of mazeMaps){
            if(mazeMap.rows === undefined)
                throw "Invalid maze - rows is not defined";
            if(mazeMap.rows[0] === undefined)
                throw "Empty maze or incorrect maze definition";
            if(mazeMap.rows.length != mazeMap.rows[0].length)
                throw "Maze width and height do not match.";
        }
    }

}

