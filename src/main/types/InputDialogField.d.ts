export type InputDialogField = TextInputDialogField | BooleanInputDialogField;

export interface TextInputDialogField extends InputDialogFieldCommonProperties {
    type: "text";
    placeholder: string;
    required: boolean;
    pattern?: string;
    inputType?: "text" | "password";
    currentValue?: string;
}

export interface BooleanInputDialogField extends InputDialogFieldCommonProperties {
    type: "boolean";
    currentValue: boolean;
}

interface InputDialogFieldCommonProperties {
    name: string;
    label: string;
    info?: string;
}
