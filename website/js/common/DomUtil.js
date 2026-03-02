/** Functions for accessing and manipulating different parts of the Document Object Model
 *
 */
/** Returns a reference to a button with the specified ID or throws
 *  an exception if it cannot be found.
 * @param buttonId
 */
export function getButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button === null)
        throw buttonId + " button not found.";
    return button;
}
/** Returns a reference to a span element with the specified ID or throws
 *  an exception if it cannot be found.
 * @param buttonId
 */
export function getSpan(spanId) {
    const span = document.getElementById(spanId);
    if (span === null)
        throw spanId + " span not found.";
    return span;
}
/** Returns a reference to a div element with the specified ID or throws
 *  an exception if it cannot be found.
 * @param buttonId
 */
export function getDiv(divId) {
    const div = document.getElementById(divId);
    if (div === null)
        throw divId + " div not found.";
    return div;
}
/** Returns a reference to a paragraph (P) element with the specified ID or throws
 *  an exception if it cannot be found.
 * @param buttonId
 */
export function getParagraph(pId) {
    const paragraph = document.getElementById(pId);
    if (paragraph === null)
        throw pId + " paragraph not found.";
    return paragraph;
}
/** Returns a reference to an input element with the specified ID or throws
 *  an exception if it cannot be found.
 * @param buttonId
 */
export function getInput(inputId) {
    const input = document.getElementById(inputId);
    if (input === null)
        throw inputId + " input not found.";
    return input;
}
/** Returns a reference to a canvas element with the specified ID or throws
 *  an exception if it cannot be found.
 * @param buttonId
 */
export function getCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas === null)
        throw canvasId + " input not found.";
    return canvas;
}
/** Returns a reference to a select element with the specified ID or throws
 *  an exception if it cannot be found.
 * @param selectId
 */
export function getSelect(selectId) {
    const select = document.getElementById(selectId);
    if (select === null)
        throw selectId + " select not found.";
    return select;
}
/** Hides specified element */
export function hide(elementID) {
    let element = document.getElementById(elementID);
    if (element === null)
        throw "Failed to hide: element not found: " + elementID;
    element.style.display = "none";
}
/** Shows specified element */
export function show(elementID) {
    let element = document.getElementById(elementID);
    if (element === null)
        throw "Failed to hide: element not found: " + elementID;
    element.style.visibility = "block";
}
/** Disables specified input element */
export function disableInput(elementID) {
    let element = document.getElementById(elementID);
    if (element === null)
        throw "Failed to disable: element not found: " + elementID;
    element.disabled = true;
}
/** Enables specified input element */
export function enableInput(elementID) {
    let element = document.getElementById(elementID);
    if (element === null)
        throw "Failed to disable: element not found: " + elementID;
    element.disabled = false;
}
/** Disables specified button element */
export function disableButton(elementID) {
    let element = document.getElementById(elementID);
    if (element === null)
        throw "Failed to disable: element not found: " + elementID;
    element.disabled = true;
}
/** Enables specified button element */
export function enableButton(elementID) {
    let element = document.getElementById(elementID);
    if (element === null)
        throw "Failed to disable: element not found: " + elementID;
    element.disabled = false;
}
