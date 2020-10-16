// @ts-ignore
import logo from "../../../logo/current-task-logo.svg";

import "bootstrap/dist/css/bootstrap.min.css";
import "./about.css";

const logoElement = /** @type {HTMLImageElement}*/ (document.getElementById("logo"));
logoElement.src = logo;

window.api.receive("appVersion", (appVersion) => {
    document.getElementById("version").textContent = appVersion;
});
