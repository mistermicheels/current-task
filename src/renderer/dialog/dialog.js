import "bootstrap/dist/css/bootstrap.min.css";
import "./dialog.css";

/** @typedef { import("../../main/windows/DialogInput").DialogInput } DialogInput */
/** @typedef { import("../../main/windows/DialogInput").DialogField } DialogField */
/** @typedef { import("../../main/windows/DialogInput").TextDialogField } TextDialogField */
/** @typedef { import("../../main/windows/DialogInput").BooleanDialogField } BooleanDialogField */

const form = document.getElementsByTagName("form")[0];
const submitButton = document.getElementsByTagName("button")[0];
const cancelButton = document.getElementsByTagName("button")[1];

/** @type {DialogInput} */
let receivedDialogInput;

window.addEventListener("load", () => {
    window.api.receive("dialogInput", handleDialogInput);
    window.api.receive("dialogShown", handleDialogShown);
    window.api.receive("hideDialogContents", hideDialogContents);

    submitButton.addEventListener("click", handleFormSubmit);
    cancelButton.addEventListener("click", sendNoResult);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            // prevent triggering any "click" listeners
            event.preventDefault();

            if (document.activeElement === cancelButton) {
                sendNoResult();
            } else {
                handleFormSubmit();
            }
        } else if (event.key === "Escape") {
            sendNoResult();
        }
    });
});

/** @param {DialogInput} input */
function handleDialogInput(input) {
    receivedDialogInput = input;

    while (form.children.length > 2) {
        form.removeChild(form.firstChild);
    }

    form.classList.remove("was-validated");

    if (input.message) {
        addMessage(input.message);
    }

    if (input.fields && input.fields.length > 0) {
        for (const field of input.fields) {
            if (field.type === "text") {
                addTextFieldToForm(field);
            } else if (field.type === "boolean") {
                addBooleanFieldToForm(field);
            }
        }
    }

    if (input.submitButtonName) {
        submitButton.textContent = input.submitButtonName;
    }

    if (input.hideCancelButton) {
        cancelButton.classList.add("visibility-hidden");
    } else {
        cancelButton.classList.remove("visibility-hidden");
    }

    // prevent temporary scroll bar from influencing height calculations
    document.body.classList.add("hide-scrollbar");
    const height = document.body.scrollHeight;
    window.api.send("dialogHeight", { height });
}

function handleDialogShown() {
    // restoring scrollbar behavior seems to behave differently based on whether the window is visible or not
    // if the class is removed before the window becomes visible, adding and removing again through dev tools changes result
    document.body.classList.remove("hide-scrollbar");

    // show contents again if they were hidden before
    document.body.classList.remove("visibility-hidden");

    // focusing needs to happen after contents are visible again
    focusFirstInput();
}

function hideDialogContents() {
    document.body.classList.add("visibility-hidden");

    // wait until browser is idle to make sure that the changes are actually rendered
    // see DialogWindowService in main for the reason behind this hiding mechanism
    // @ts-ignore
    requestIdleCallback(() => {
        window.api.send("dialogContentsHidden", undefined);
    });
}

/** @param {string} message */
function addMessage(message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    form.insertBefore(paragraph, submitButton);
}

/** @param {TextDialogField} field */
function addTextFieldToForm(field) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("form-group");

    formGroup.appendChild(getLabelForField(field));

    const input = document.createElement("input");
    input.type = field.inputType || "text";
    input.id = field.name;
    input.name = field.name;

    input.placeholder = field.placeholder;
    input.required = field.required;

    if (field.required) {
        input.placeholder = `${field.placeholder} (required)`;
    }

    if (field.pattern) {
        input.pattern = field.pattern;
    }

    input.classList.add("form-control");

    if (field.currentValue) {
        input.setAttribute("value", field.currentValue);
    }

    formGroup.appendChild(input);

    if (field.info) {
        formGroup.appendChild(getInfoForMessage(field.info));
    }

    form.insertBefore(formGroup, submitButton);
}

/** @param {BooleanDialogField} field */
function addBooleanFieldToForm(field) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("form-group");

    const customSwitch = document.createElement("div");
    customSwitch.classList.add("custom-control", "custom-switch");
    formGroup.appendChild(customSwitch);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = field.name;
    input.name = field.name;
    input.classList.add("custom-control-input");
    input.checked = field.currentValue;
    customSwitch.appendChild(input);

    const label = getLabelForField(field);
    label.classList.add("custom-control-label");
    customSwitch.appendChild(label);

    if (field.info) {
        formGroup.appendChild(getInfoForMessage(field.info));
    }

    form.insertBefore(formGroup, submitButton);
}

/** @param {DialogField} field */
function getLabelForField(field) {
    const label = document.createElement("label");
    label.setAttribute("for", field.name);
    label.textContent = field.label;
    return label;
}

/** @param {string} message */
function getInfoForMessage(message) {
    const info = document.createElement("small");
    info.classList.add("form-text", "text-muted");
    info.textContent = message;
    return info;
}

function focusFirstInput() {
    const receivedFields = receivedDialogInput.fields;

    if (!receivedFields || receivedFields.length === 0) {
        return;
    }

    const firstFormElement = document.getElementById(receivedFields[0].name);

    if (firstFormElement instanceof HTMLInputElement && firstFormElement.type !== "checkbox") {
        firstFormElement.focus();
        firstFormElement.select();
    }
}

function handleFormSubmit() {
    form.classList.add("was-validated");

    if (!form.checkValidity()) {
        return;
    }

    if (!receivedDialogInput.fields) {
        window.api.send("dialogResult", { result: {} });
        return;
    }

    const result = {};

    for (const field of receivedDialogInput.fields) {
        const element = document.getElementById(field.name);

        if (!(element instanceof HTMLInputElement)) {
            // should never happen unless we have a bug in the form generation logic
            throw new Error(`Found no input element for field ${field.name}`);
        }

        if (field.type === "text") {
            result[field.name] = element.value || undefined;
        } else if (field.type === "boolean") {
            result[field.name] = element.checked;
        }
    }

    window.api.send("dialogResult", { result });
}

function sendNoResult() {
    window.api.send("dialogResult", { result: undefined });
}
