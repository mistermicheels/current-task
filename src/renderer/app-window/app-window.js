import { dom, library } from "@fortawesome/fontawesome-svg-core";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons/faExclamationCircle";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";

import "bootstrap/dist/css/bootstrap.min.css";
import "./app-window.css";

// Font Awesome setup
library.add(faExclamationCircle);
library.add(faExclamationTriangle);
dom.i2svg();

const bodyElement = document.getElementsByTagName("body")[0];
const messageHeadingElement = document.getElementById("message-heading");
const messageElement = document.getElementById("message");

let lastStatusAndMessage = { status: "ok", message: "" };
let useDarkStyle = false;

window.addEventListener("resize", fitMessage);

window.api.receive("statusAndMessage", (statusAndMessage) => {
    lastStatusAndMessage = statusAndMessage;
    updateStyle();
    fitMessage();
});

window.api.receive("appWindowStyle", (style) => {
    useDarkStyle = style.useDarkStyle;
    updateStyle();
});

function updateStyle() {
    if (lastStatusAndMessage.status == "ok" && useDarkStyle) {
        bodyElement.className = "dark-ok";
    } else {
        bodyElement.className = lastStatusAndMessage.status;
    }
}

function fitMessage() {
    const message = lastStatusAndMessage.message;
    messageElement.textContent = message;
    let currentLength = message.length;

    while (messageHeadingElement.clientHeight > window.innerHeight) {
        currentLength = currentLength - 1;
        messageElement.textContent = message.substring(0, currentLength);
    }
}

// custom dragging mechanism as workaround for the limitations of Electron's built-in dragging functionality
// see also https://github.com/electron/electron/issues/1354#issuecomment-404348957

let mouseXWithinWindow;
let mouseYWithinWindow;
let draggingAnimationFrameId;

window.addEventListener("mousedown", onDragStart);

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        onDragEnd();
    }
});

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
