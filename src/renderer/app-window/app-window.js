import { dom, library } from "@fortawesome/fontawesome-svg-core";
import { faExclamationCircle, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

import "../../../node_modules/bootstrap/dist/css/bootstrap.css";
import "./app-window.css";

// Font Awesome setup
library.add(faExclamationCircle);
library.add(faExclamationTriangle);
dom.i2svg();

const bodyElement = document.getElementsByTagName("body")[0];
const messageHeadingElement = document.getElementById("message-heading");
const messageElement = document.getElementById("message");

let currentMessage;

window.addEventListener("resize", fitMessage);

window.api.receive("statusAndMessage", (tasksState) => {
    bodyElement.className = tasksState.status;
    currentMessage = tasksState.message;
    fitMessage();
});

function fitMessage() {
    messageElement.textContent = currentMessage;
    let currentLength = currentMessage.length;

    while (messageHeadingElement.clientHeight > window.innerHeight) {
        currentLength = currentLength - 1;
        messageElement.textContent = currentMessage.substring(0, currentLength);
    }
}

// custom dragging mechanism as workaround for the limitations of Electron's built-in dragging functionality
// see also https://github.com/electron/electron/issues/1354#issuecomment-404348957

let mouseXWithinWindow;
let mouseYWithinWindow;
let draggingAnimationFrameId;

window.addEventListener("mousedown", onDragStart);

function onDragStart(event) {
    mouseXWithinWindow = event.clientX;
    mouseYWithinWindow = event.clientY;
    document.addEventListener("mouseup", onDragEnd);
    draggingAnimationFrameId = requestAnimationFrame(moveWindow);
}

function onDragEnd() {
    window.api.send("appWindowMoved", undefined);
    document.removeEventListener("mouseup", onDragEnd);
    cancelAnimationFrame(draggingAnimationFrameId);
}

function moveWindow() {
    window.api.send("appWindowMoving", { mouseXWithinWindow, mouseYWithinWindow });
    draggingAnimationFrameId = requestAnimationFrame(moveWindow);
}
