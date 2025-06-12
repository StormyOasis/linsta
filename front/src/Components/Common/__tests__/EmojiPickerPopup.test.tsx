import React from "react";

import '@testing-library/jest-dom';
import EmojiPickerPopup from "../EmojiPickerPopup";
import { renderWithStore } from "../../../utils/test-utils";
import { EmojiClickData } from "emoji-picker-react";

describe("EmojiPickerPopup", () => {
    it("renders", () => {
        const r = renderWithStore(<EmojiPickerPopup
            onEmojiClick={function (_emoji: EmojiClickData): void {
                throw new Error("Function not implemented.");
            }} />);
        expect(r).toMatchSnapshot();
    });
});