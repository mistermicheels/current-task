export interface DialogInput {
    message?: string;
    fields?: DialogField[];
    submitButtonName: string;
    hideCancelButton?: boolean;
}

export type DialogField = TextDialogField | TextListDialogField | BooleanDialogField;

export interface TextDialogField extends DialogFieldCommonProperties {
    type: "text";
    placeholder: string;
    required: boolean;
    pattern?: string;
    inputType?: "text" | "password";
    currentValue?: string;
}

export interface TextListDialogField extends DialogFieldCommonProperties {
    type: "textList";
    listPlaceholder: string;
    itemPlaceholder: string;
    buttonText: string;
    currentValue: string[];
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
