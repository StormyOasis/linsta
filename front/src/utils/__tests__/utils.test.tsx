import '@testing-library/jest-dom';
import {
    validateEmailPhone,
    validateFullName,
    validatePassword,
    isHashtag,
    isMention,
    validateUrl,
    isVideoFileFromPath,
    isVideoFileFromType,
    getSanitizedText,
    getStoredSearchQueries,
    storeSearchQueries,
    removeStoredSearchQuery,
    buildCollabSearchText
} from '../utils';
import { Profile } from '../../api/types';

describe("Test utility functions", () => {
    it("Should return true for valid email", () => {
        expect(validateEmailPhone("abc@efg.com")).toBeTruthy();
    });

    it("Should return true for valid phone", () => {
        expect(validateEmailPhone("+15555555555")).toBeTruthy();
    });

    it("Should return false for invalid email or phone", () => {
        expect(validateEmailPhone("bad email or phone")).toBeFalsy();
    });

    it("Should return true for valid password", () => {
        expect(validatePassword("Pa$$w0rd!")).toBeTruthy();
    });

    it("Should return false for invalid password", () => {
        expect(validatePassword("bad password")).toBeFalsy();
    });

    it("Should return true for valid full name", () => {
        expect(validateFullName("First Middle Last")).toBeTruthy();
    });

    it("Should return false for invalid full name", () => {
        expect(validateFullName("")).toBeFalsy();
    });

    it("Should detect hashtag", () => {
        expect(isHashtag("#tag")).toBe(true);
        expect(isHashtag("tag")).toBe(false);
    });

    it("Should detect mention", () => {
        expect(isMention("@user")).toBe(true);
        expect(isMention("user")).toBe(false);
    });

    it("Should validate URLs", () => {
        expect(validateUrl("https://example.com")).toBe(true);
        expect(validateUrl("not a url")).toBe(false);
        expect(validateUrl("")).toBe(true);
        expect(validateUrl(undefined)).toBe(true);
    });

    it("Should detect valid video file extensions", () => {
        expect(isVideoFileFromPath("video.mp4")).toBe(true);
        expect(isVideoFileFromPath("video.txt")).toBe(false);
    });

    it("Should detect valid video mime types", () => {
        expect(isVideoFileFromType("video/mp4")).toBe(true);
        expect(() => isVideoFileFromType("txt")).toThrow();
    });

    it("Should sanitize HTML and return plain text", () => {
        const [html, text] = getSanitizedText("<b>Hello</b> <script>alert(1)</script>");
        expect(html).toContain("<b>Hello</b>");
        expect(html).not.toContain("<script>");
        expect(text).toBe("Hello");
    });

    describe("Search query storage utilities", () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it("Should store and retrieve string queries", () => {
            storeSearchQueries("test");
            expect(getStoredSearchQueries()).toContain("test");
        });

        it("Should not store duplicate string queries", () => {
            storeSearchQueries("test");
            storeSearchQueries("test");
            expect(getStoredSearchQueries().filter(q => q === "test").length).toBe(1);
        });

        it("Should store and retrieve Profile objects", () => {
            const profile:Profile = {
                profileId: "1", userName: "user", pfp: "",
                userId: '123'
            };
            storeSearchQueries(profile);
            expect(getStoredSearchQueries().some(q => typeof q !== "string" && q.profileId === "1")).toBe(true);
        });

        it("Should not store duplicate Profile objects", () => {
            const profile:Profile = { profileId: "1", userName: "user", pfp: "", userId: '123' };
            storeSearchQueries(profile);
            storeSearchQueries(profile);
            expect(getStoredSearchQueries().filter(q => typeof q !== "string" && q.profileId === "1").length).toBe(1);
        });

        it("Should remove stored string query", () => {
            storeSearchQueries("test");
            removeStoredSearchQuery("test");
            expect(getStoredSearchQueries()).not.toContain("test");
        });

        it("Should remove stored Profile query", () => {
            const profile:Profile = { profileId: "1", userName: "user", pfp: "", userId: '123' };
            storeSearchQueries(profile);
            removeStoredSearchQuery(profile);
            expect(getStoredSearchQueries().some(q => typeof q !== "string" && q.profileId === "1")).toBe(false);
        });
    });

    it("Should build collab search text from profiles", () => {
        const profiles:Record<string, Profile> = {
            '123': { profileId: "1", userName: "alice", pfp: "", userId: '123' },
            '234': { profileId: "2", userName: "bob", pfp: "", userId: '234' }
        };
        expect(buildCollabSearchText(profiles)).toBe("alice bob");
        expect(buildCollabSearchText({})).toBe("");
    });
});