import React from "react";
import { screen } from "@testing-library/react";
import MemoizedProfilePic from "../ProfilePicMemo";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock getPfpFromProfile utility
jest.mock("../../../utils/utils", () => ({
    getPfpFromProfile: (profile: any) => profile.pfp || "/default-pfp.jpg",
}));

describe("MemoizedProfilePic", () => {
    const profile = {
        userName: "alice",
        pfp: "/alice.jpg",
    };

    it("renders profile picture with correct src and alt", () => {
        const r = renderWithStore(<MemoizedProfilePic profile={profile} />);
        const img = screen.getByAltText("alice's profile picture") as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.src).toContain("/alice.jpg");
        expect(img).toHaveAttribute("aria-label", "alice's profile picture");
        expect(r).toMatchSnapshot();
    });

    it("applies marginRight style to wrapper", () => {
        const r = renderWithStore(<MemoizedProfilePic profile={profile} marginRight="12px" />);
        const wrapper = imgWrapper();
        expect(wrapper).toHaveStyle("margin-right: 12px");
        expect(r).toMatchSnapshot();
    });

    it("renders nothing if profile is not provided", () => {
        const r = renderWithStore(<MemoizedProfilePic profile={null} />);
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    // Helper to get the wrapper span
    function imgWrapper() {
        return screen.getByLabelText("alice's profile picture").parentElement as HTMLElement;
    }
});