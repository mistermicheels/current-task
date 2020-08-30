// @ts-ignore
import logo from "../../../logo/current-task-logo.svg";

import "../../../node_modules/bootstrap/dist/css/bootstrap.css";
import "./about.css";

// @ts-ignore
document.getElementById("logo").src = logo;

window.api.receive("appVersion", (appVersion) => {
    document.getElementById("version").textContent = appVersion;
});
