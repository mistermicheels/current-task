const messageElement = document.getElementById("message");

window.api.receive("fromMain", (tasksState) => {
    if (tasksState.state === "error") {
        messageElement.textContent = `🛑 ${tasksState.message}`;
        messageElement.style.color = "white";
        messageElement.style.backgroundColor = "red";
    } else if (tasksState.state === "warning") {
        messageElement.textContent = `⚠️ ${tasksState.message}`;
        messageElement.style.color = "black";
        messageElement.style.backgroundColor = "yellow";
    } else if (tasksState.state === "ok") {
        messageElement.textContent = tasksState.message;
        messageElement.style.color = "black";
        messageElement.style.backgroundColor = "white";
    }

    messageElement.setAttribute("title", tasksState.message);
});
