/** @typedef { import("../../main/types/InputDialogField").InputDialogField } InputDialogField */

const form = document.getElementsByTagName("form")[0];
const submitButton = document.getElementsByTagName("button")[0];

window.addEventListener("load", () => {
    /** @type {InputDialogField[]} */
    let fields;

    window.api.receive("fromMain", (data) => {
        fields = data.fields;

        for (const field of fields) {
            addFieldToForm(field);
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
                result[field.name] = element.value || undefined;
            }

            window.api.send("dialogResult", { result });
        }
    });
});

/** @param {InputDialogField} field */
function addFieldToForm(field) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("form-group");

    const label = document.createElement("label");
    label.setAttribute("for", field.name);
    label.textContent = field.label;
    formGroup.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.id = field.name;
    input.name = field.name;
    input.placeholder = field.placeholder;
    input.required = field.required;

    if (field.pattern) {
        input.pattern = field.pattern;
        input.placeholder = `${field.placeholder} (required)`;
    }

    input.classList.add("form-control");
    formGroup.appendChild(input);

    form.insertBefore(formGroup, submitButton);
}
