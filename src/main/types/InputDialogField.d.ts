export type InputDialogField = TextInputDialogField;

interface TextInputDialogField extends InputDialogFieldCommonProperties {
    type: "text";
    placeholder: string;
    required: boolean;
    pattern?: string;
}

interface InputDialogFieldCommonProperties {
    type: string;
    name: string;
    label: string;
}
