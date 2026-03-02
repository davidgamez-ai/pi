import { INFO_BOX_ID } from "./Globals.js";
import { DEBUG_LOGS } from "./Debug.js";
/** Simple static logging class for application.
 *  Outputs logs to the info box and the console.
 *  Use for logs that you want to display to user - not for debugging.
 */
export class Logger {
    /** Logs information message */
    static info(msg) {
        //Get reference to log box
        let infoBox = document.getElementById(INFO_BOX_ID);
        //Add message
        if (DEBUG_LOGS)
            console.log(msg);
        infoBox.innerHTML = infoBox.innerHTML + "<p>" + msg + "</p>";
    }
    /** Logs error message */
    static error(msg) {
        //Get reference to log box
        let infoBox = document.getElementById(INFO_BOX_ID);
        //Add message
        console.error(msg);
        infoBox.innerHTML = infoBox.innerHTML + "<p style='color: red; font-weight: bold;'>" + msg + "</p>";
    }
}
