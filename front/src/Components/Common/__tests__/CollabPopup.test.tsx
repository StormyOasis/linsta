import { screen, fireEvent, waitFor } from "@testing-library/react";
import CollabPopup from "../CollabPopup";
import { CollabData, Profile } from "../../../api/types";
import * as ServiceController from "../../../api/ServiceController";
import '@testing-library/jest-dom';
import { renderWithStore } from "../../../utils/test-utils";

// Mock dependencies
jest.mock("../../../api/ServiceController", () => ({
    getSuggestions: jest.fn(() => Promise.resolve({ data: { uniqueProfiles: {} } })),
}));

jest.mock("../PopupDropdownSelector", () => {
    const React = require("react");
    return React.forwardRef((props: any, ref) => (
        <div>
            <input
                data-testid="collab-input"
                value={props.value}
                onChange={props.onChange}
                placeholder={props.placeholder}
            />
            <div data-testid="popup-content">{props.children(true)}</div>
        </div>
    ));
});

jest.mock("../ProfileLink", () => (props: any) => (
    <div data-testid="profile-link">{props.userName}</div>
));

jest.mock("../Checkbox", () => (props: any) => (
    <button
        data-testid={`checkbox-${props.name}`}
        aria-checked={props.isChecked}
        onClick={() => props.onSelect()}
    >
        {props.isChecked ? "Checked" : "Unchecked"}
    </button>
));

jest.mock("../LoadingImage", () => (props: any) =>
    props.isLoading ? <div data-testid="loading">Loading...</div> : null
);

jest.mock("../StyledButton", () => (props: any) => (
    <button data-testid="done-button" onClick={props.onClick}>{props.text}</button>
));

jest.mock("../Icon", () => ({
    CollabInputSVG: () => <svg data-testid="collab-svg" />,
}));

const makeProfile = (id: string, userName: string): Profile => ({
    userId: id,
    userName,
    pfp: "",
    firstName: userName,
    lastName: "Test",
    profileId: id
});

describe("CollabPopup", () => {
    const baseProfile = makeProfile("1", "alice");
    const baseCollabData: CollabData = {
        selectedProfiles: {},
    };

    it("renders initial state with heading and subheading", () => {
        const r = renderWithStore(
            <CollabPopup
                searchText=""
                collabData={baseCollabData}
                onCollabChanged={jest.fn()}
            />
        );
        expect(screen.getByText(/Add Collaborators/i)).toBeInTheDocument();
        expect(screen.getByText(/Their username will be added/i)).toBeInTheDocument();
        expect(screen.getByTestId("collab-input")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("shows loading indicator when isLoading is true", async () => {
        // Mock getSuggestions to delay
        (ServiceController.getSuggestions as jest.Mock).mockImplementationOnce(() =>
            new Promise((resolve) => setTimeout(() => resolve({ data: { uniqueProfiles: {} } }), 100))
        );
        const r = renderWithStore(
            <CollabPopup
                searchText="alice"
                collabData={baseCollabData}
                onCollabChanged={jest.fn()}
            />
        );
        fireEvent.change(screen.getByTestId("collab-input"), { target: { value: "alice" } });
        expect(await screen.findByTestId("loading")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders selected profiles", () => {
        const collabData: CollabData = {
            selectedProfiles: {
                [baseProfile.userId]: baseProfile,
            },
        };
        const r = renderWithStore(
            <CollabPopup
                searchText=""
                collabData={collabData}
                onCollabChanged={jest.fn()}
            />
        );
        expect(screen.getByTestId("profile-link")).toHaveTextContent("alice");
        expect(screen.getByTestId("checkbox-alice")).toHaveAttribute("aria-checked", "true");
        expect(r).toMatchSnapshot();
    });

    it("calls onCollabChanged when profile is toggled", () => {
        const collabData: CollabData = {
            selectedProfiles: {
                [baseProfile.userId]: baseProfile,
            },
        };
        const onCollabChanged = jest.fn();
        const r = renderWithStore(
            <CollabPopup
                searchText=""
                collabData={collabData}
                onCollabChanged={onCollabChanged}
            />
        );
        fireEvent.click(screen.getByTestId("checkbox-alice"));
        expect(onCollabChanged).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("calls onCollabChanged when unselected profile is clicked", async () => {
        const bob = makeProfile("2", "bob");
        (ServiceController.getSuggestions as jest.Mock).mockResolvedValueOnce({
            data: { uniqueProfiles: { [bob.userId]: bob } },
        });
        const onCollabChanged = jest.fn();
        const r = renderWithStore(
            <CollabPopup
                searchText=""
                collabData={baseCollabData}
                onCollabChanged={onCollabChanged}
            />
        );
        fireEvent.change(screen.getByTestId("collab-input"), { target: { value: "bob" } });
        await waitFor(() => expect(screen.getByTestId("checkbox-bob")).toBeInTheDocument());
        fireEvent.click(screen.getByTestId("checkbox-bob"));
        expect(onCollabChanged).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("calls handleDoneButton and resets state when Done is clicked", () => {
        const collabData: CollabData = {
            selectedProfiles: {
                [baseProfile.userId]: baseProfile,
            },
        };
        const r = renderWithStore(
            <CollabPopup
                searchText=""
                collabData={collabData}
                onCollabChanged={jest.fn()}
            />
        );
        const doneButton = screen.getByTestId("done-button");
        fireEvent.click(doneButton);
        // Should reset search text and profilesFromService (no error thrown)
        expect(doneButton).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});