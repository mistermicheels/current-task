const bodyElement = document.getElementsByTagName("body")[0];
const messageHeadingElement = document.getElementById("message-heading");
const messageElement = document.getElementById("message");

let currentMessage;

window.addEventListener("resize", fitMessage);

window.api.receive("fromMain", (tasksState) => {
    bodyElement.className = tasksState.state;
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
