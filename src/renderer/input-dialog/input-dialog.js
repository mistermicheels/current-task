/** @typedef { import("../../main/types/InputDialogField").InputDialogField } InputDialogField */
/** @typedef { import("../../main/types/InputDialogField").TextInputDialogField } TextInputDialogField */
/** @typedef { import("../../main/types/InputDialogField").BooleanInputDialogField } BooleanInputDialogField */

const form = document.getElementsByTagName("form")[0];
const submitButton = document.getElementsByTagName("button")[0];

window.addEventListener("load", () => {
    /** @type {InputDialogField[]} */
    let fields;

    window.api.receive("fromMain", (data) => {
        fields = data.fields;

        for (const field of fields) {
            if (field.type === "text") {
                addTextFieldToForm(field);
            } else if (field.type === "boolean") {
                addBooleanFieldToForm(field);
            }
        }

        document.getElementById(fields[0].name).focus();
        const height = document.documentElement.scrollHeight;
        window.api.send("dialogHeight", { height });
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        form.classList.add("was-validated");

        if (form.checkValidity()) {
            const result = {};

            for (const field of fields) {
                const element = document.getElementById(field.name);

                if (field.type === "text") {
                    result[field.name] = element.value || undefined;
                } else if (field.type === "boolean") {
                    result[field.name] = element.checked;
                }
            }

            window.api.send("dialogResult", { result });
        }
    });
});

/** @param {TextInputDialogField} field */
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

/** @param {BooleanInputDialogField} field */
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

/** @param {InputDialogField} field */
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
