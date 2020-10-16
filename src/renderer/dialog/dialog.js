import "bootstrap/dist/css/bootstrap.min.css";
import "./dialog.css";

/** @typedef { import("../../main/windows/DialogInput").DialogInput } DialogInput */
/** @typedef { import("../../main/windows/DialogInput").DialogField } DialogField */
/** @typedef { import("../../main/windows/DialogInput").TextDialogField } TextDialogField */
/** @typedef { import("../../main/windows/DialogInput").TextListDialogField } TextListDialogField */
/** @typedef { import("../../main/windows/DialogInput").BooleanDialogField } BooleanDialogField */

const form = document.getElementsByTagName("form")[0];
const submitButton = document.getElementsByTagName("button")[0];
const cancelButton = document.getElementsByTagName("button")[1];

/** @type {Map<string, string[]>} */
const textListEntriesPerField = new Map();

const textListInputIdSuffix = "_textListInput";
const textListValuesIdSuffix = "_textListValues";

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

            const activeElement = /** @type {HTMLElement} */ (document.activeElement);

            if (activeElement.dataset.textListFieldName) {
                addToTextList(activeElement.dataset.textListFieldName);
            } else if (document.activeElement === cancelButton) {
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
    textListEntriesPerField.clear();
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
            } else if (field.type === "textList") {
                addTextListFieldToForm(field);
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
    input.required = field.required;
    input.placeholder = field.required ? `${field.placeholder} (required)` : field.placeholder;
    input.value = field.currentValue || "";

    if (field.pattern) {
        input.pattern = field.pattern;
    }

    input.classList.add("form-control");
    formGroup.appendChild(input);

    if (field.info) {
        formGroup.appendChild(getInfoForMessage(field.info));
    }

    form.insertBefore(formGroup, submitButton);
}

/** @param {TextListDialogField} field */
function addTextListFieldToForm(field) {
    textListEntriesPerField.set(field.name, field.currentValue || []);

    const formGroup = document.createElement("div");
    formGroup.classList.add("form-group");

    formGroup.appendChild(getLabelForField(field));

    const valuesDiv = document.createElement("div");
    valuesDiv.id = `${field.name}${textListValuesIdSuffix}`;
    valuesDiv.classList.add("mb-2");
    formGroup.appendChild(valuesDiv);

    const inputGroup = document.createElement("div");
    inputGroup.classList.add("input-group");

    const input = document.createElement("input");
    input.type = "text";
    input.id = `${field.name}${textListInputIdSuffix}`;
    input.name = `${field.name}${textListInputIdSuffix}`;
    input.dataset.textListFieldName = field.name;
    input.placeholder = field.itemPlaceholder;
    input.classList.add("form-control");
    inputGroup.appendChild(input);

    const inputGroupAppendDiv = document.createElement("div");
    inputGroupAppendDiv.classList.add("input-group-append");
    const inputButton = document.createElement("button");
    inputButton.classList.add("btn", "btn-primary");
    inputButton.type = "button";
    inputButton.dataset.textListFieldName = field.name;
    inputButton.innerText = field.buttonText;
    inputGroupAppendDiv.appendChild(inputButton);
    inputButton.addEventListener("click", () => addToTextList(field.name));

    inputGroup.appendChild(inputGroupAppendDiv);

    formGroup.appendChild(inputGroup);

    if (field.info) {
        formGroup.appendChild(getInfoForMessage(field.info));
    }

    form.insertBefore(formGroup, submitButton);

    // this can only happen once the created element have been added to the document
    refreshTextListValues(field.name);
}

/** @param {string} fieldName */
function addToTextList(fieldName) {
    const inputId = `${fieldName}${textListInputIdSuffix}`;
    const input = /** @type {HTMLInputElement} */ (document.getElementById(inputId));

    const values = textListEntriesPerField.get(fieldName);

    if (!input.value || values.includes(input.value)) {
        return;
    }

    values.push(input.value);
    values.sort((a, b) => a.localeCompare(b));
    refreshTextListValues(fieldName);
    input.value = "";
}

/**
 * @param {string} fieldName
 * @param {string} value
 */
function removeFromTextList(fieldName, value) {
    const values = textListEntriesPerField.get(fieldName);
    values.splice(values.indexOf(value), 1);
    refreshTextListValues(fieldName);
}

/** @param {string} fieldName */
function refreshTextListValues(fieldName) {
    const valuesDiv = document.getElementById(`${fieldName}${textListValuesIdSuffix}`);

    while (valuesDiv.children.length) {
        valuesDiv.removeChild(valuesDiv.firstChild);
    }

    const values = textListEntriesPerField.get(fieldName);

    if (values.length === 0) {
        valuesDiv.appendChild(getTextListPlaceholder(fieldName));
        return;
    }

    for (const value of values) {
        const badge = document.createElement("span");
        badge.classList.add("badge", "badge-primary", "mr-1");
        badge.textContent = value;
        badge.addEventListener("click", () => removeFromTextList(fieldName, value));
        valuesDiv.appendChild(badge);
    }
}

/** @param {string} fieldName */
function getTextListPlaceholder(fieldName) {
    const dialogInputField = receivedDialogInput.fields.find((field) => field.name === fieldName);

    const paragraph = document.createElement("p");
    paragraph.classList.add("text-muted", "mb-0");
    const small = document.createElement("small");
    small.innerText = /** @type {TextListDialogField} */ (dialogInputField).listPlaceholder;
    paragraph.appendChild(small);
    return paragraph;
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
        result[field.name] = getValueForField(field);
    }

    window.api.send("dialogResult", { result });
}

/** @param {DialogField} field */
function getValueForField(field) {
    if (field.type === "textList") {
        return textListEntriesPerField.get(field.name);
    }

    const element = /** @type {HTMLInputElement} */ (document.getElementById(field.name));

    if (field.type === "text") {
        return element.value || undefined;
    } else if (field.type === "boolean") {
        return element.checked;
    }
}

function sendNoResult() {
    window.api.send("dialogResult", { result: undefined });
}
