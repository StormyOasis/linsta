import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import ProfileLink from "../ProfileLink";
import '@testing-library/jest-dom';
import { renderWithStore } from '../../../utils/test-utils';

// Mock StyledLink to a simple anchor for easier testing
jest.mock("../StyledLink", () => (props: any) => (
    <a
        data-testid="styled-link"
        href={props.to}
        aria-label={props["aria-label"]}
        role={props.role}
        onClick={props.onClick}
        style={props.styleOverride}
    >
        {props.children}
    </a>
));

const baseProps = {
    collaborators: {},
    url: "/profile/alice",
    userName: "alice",
    fullName: "Alice Smith",
    location: "Wonderland",
    pfp: "/pfp.jpg",
    pfpWidth: "40px",
    showFullName: false,
    showPfp: false,
    showCollaborators: false,
    showUserName: false,
    showLocation: false,
};

describe("ProfileLink", () => {
    it("throws error if no url and no onClick", () => {
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});
        expect(() =>
            renderWithStore(
                <ProfileLink
                    {...baseProps}
                    url={null}
                />
            )
        ).toThrow("Profile link must have url or click handler");
        spy.mockRestore();
    });

    it("renders profile picture when showPfp is true", () => {
        const r = renderWithStore(
            <ProfileLink
                {...baseProps}
                showPfp={true}
            />
        );
        const img = screen.getByAltText("alice's profile picture") as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.src).toContain("/pfp.jpg");
        expect(img).toHaveAttribute("aria-label", "alice's profile picture");
        expect(img).toHaveStyle("width: 40px");
        expect(r).toMatchSnapshot();
    });

    it("renders user name when showUserName is true", () => {
        const r = renderWithStore(
            <ProfileLink
                {...baseProps}
                showUserName={true}
            />
        );
        expect(screen.getByText("alice")).toBeInTheDocument();
        expect(screen.getByTestId("styled-link")).toHaveAttribute("href", "/profile/alice");
        expect(r).toMatchSnapshot();
    });

    it("renders full name when showFullName is true", () => {
        const r = renderWithStore(
            <ProfileLink
                {...baseProps}
                showFullName={true}
            />
        );
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("renders location when showLocation is true", () => {
        const r = renderWithStore(
            <ProfileLink
                {...baseProps}
                showLocation={true}
            />
        );
        expect(screen.getByText("Wonderland")).toBeInTheDocument();
        expect(screen.getByText("Wonderland").closest("a")).toHaveAttribute(
            "href",
            expect.stringContaining("/explore?q=Wonderland")
        );
        expect(r).toMatchSnapshot();
    });

    it("renders collaborators when showCollaborators is true and collaborators exist", () => {
        const collaborators = {
            "2": { userId: "2", userName: "bob", pfp: "", firstName: "Bob", lastName: "Builder", profileId: "2" },
            "3": { userId: "3", userName: "carol", pfp: "", firstName: "Carol", lastName: "Smith", profileId: "3" },
        };
        const r = renderWithStore(
            <ProfileLink
                {...baseProps}
                showUserName={true}
                showCollaborators={true}
                collaborators={collaborators}
                onCollaboratorsClick={jest.fn()}
            />
        );
        expect(screen.getByText("and")).toBeInTheDocument();
        expect(screen.getByText("2 others")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });

    it("calls onCollaboratorsClick when collaborators link is clicked", () => {
        const collaborators = {
            "2": { userId: "2", userName: "bob", pfp: "", firstName: "Bob", lastName: "Builder", profileId: "2" },
        };
        const onCollaboratorsClick = jest.fn();
        const r = renderWithStore(
            <ProfileLink
                {...baseProps}
                showUserName={true}
                showCollaborators={true}
                collaborators={collaborators}
                onCollaboratorsClick={onCollaboratorsClick}
            />
        );
        fireEvent.click(screen.getByText("1 other"));
        expect(onCollaboratorsClick).toHaveBeenCalled();
        expect(r).toMatchSnapshot();
    });

    it("renders with onClick if url is not provided", () => {
        const onClick = jest.fn();
        const r = renderWithStore(
            <ProfileLink
                {...baseProps}
                url={null}
                onClick={onClick}
                showUserName={true}
            />
        );
        expect(screen.getByText("alice")).toBeInTheDocument();
        expect(r).toMatchSnapshot();
    });
});