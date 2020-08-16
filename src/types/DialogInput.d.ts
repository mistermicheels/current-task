export interface DialogInput {
    message?: string;
    fields?: DialogField[];
    submitButtonName?: string;
}

export type DialogField = TextDialogField | BooleanDialogField;

export interface TextDialogField extends DialogFieldCommonProperties {
    type: "text";
    placeholder: string;
    required: boolean;
    pattern?: string;
    inputType?: "text" | "password";
    currentValue?: string;
}

export interface BooleanDialogField extends DialogFieldCommonProperties {
    type: "boolean";
    currentValue: boolean;
}

interface DialogFieldCommonProperties {
    name: string;
    label: string;
    info?: string;
}
