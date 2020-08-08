import { Rectangle } from "electron";

export interface DefaultWindowBoundsListener {
    onDefaultWindowBoundsChanged: (bounds: Rectangle) => void;
}
