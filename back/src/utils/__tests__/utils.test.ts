import { Context } from 'koa';
import DBConnector from '../../Connectors/DBConnector';
import * as utilService from '../utils';
import { getFileExtByMimeType, getLikesByPost, getPostByPostId, getPostIdFromEsId, handleValidationError, isEmail, isPhone, isValidPassword, obfuscateEmail, obfuscatePhone, sanitizeInput, stripNonNumericCharacters } from '../utils';
import { RedisConnector } from '../../Connectors/RedisConnector';
import ESConnector from '../../Connectors/ESConnector';

jest.mock('../../Connectors/DBConnector');
jest.mock('../../Connectors/RedisConnector');
jest.mock('../../Connectors/ESConnector');

describe('stripNonNumericCharacters', () => {

    it('should return a string containing only numeric characters', () => {
        const input = "a1b2c3";
        const output = "123";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should return an empty string when no numeric characters are present', () => {
        const input = "abcdef";
        const output = "";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should return the input string if it contains only numeric characters', () => {
        const input = "123456";
        const output = "123456";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should remove spaces and other non-numeric characters', () => {
        const input = "12 34-56";
        const output = "123456";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should handle strings starting with non-numeric characters', () => {
        const input = "abc123";
        const output = "123";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should handle strings ending with non-numeric characters', () => {
        const input = "123abc";
        const output = "123";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should return an empty string when input is empty', () => {
        const input = "";
        const output = "";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should handle strings with mixed non-numeric characters between numbers', () => {
        const input = "1a2b3c4d";
        const output = "1234";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should handle large numbers with non-numeric characters', () => {
        const input = "123,456,789";
        const output = "123456789";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should handle strings with special characters', () => {
        const input = "abc$%#123";
        const output = "123";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

    it('should return the same value when only numeric characters are provided', () => {
        const input = "9876543210";
        const output = "9876543210";
        expect(stripNonNumericCharacters(input)).toBe(output);
    });

});

describe('isEmail', () => {
    it('should return true for valid email address', () => {
        expect(isEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid email address (missing "@" symbol)', () => {
        expect(isEmail('testexample.com')).toBe(false);
    });

    it('should return false for invalid email address (missing domain)', () => {
        expect(isEmail('test@.com')).toBe(false);
    });

    it('should return false for invalid email address (extra characters)', () => {
        expect(isEmail('test@com$')).toBe(false);
    });
});

describe('isPhone', () => {
    it('should return true for valid phone number', () => {
        expect(isPhone('+1-800-555-5555')).toBe(true);
    });

    it('should return true for phone number with spaces and parentheses', () => {
        expect(isPhone('(800) 555-5555')).toBe(true);
    });

    it('should return false for invalid phone number (missing digits)', () => {
        expect(isPhone('800-555')).toBe(false);
    });

    it('should return false for invalid phone number (too many characters)', () => {
        expect(isPhone('123-123-123-123-123-123')).toBe(false);
    });
});

describe('isValidPassword', () => {
    it('should return true for valid password (contains uppercase, lowercase, digit, special character)', () => {
        expect(isValidPassword('Test123!')).toBe(true);
    });

    it('should return false for password without uppercase letter', () => {
        expect(isValidPassword('test123!')).toBe(false);
    });

    it('should return false for password without a digit', () => {
        expect(isValidPassword('Test!@#')).toBe(false);
    });

    it('should return false for password shorter than 8 characters', () => {
        expect(isValidPassword('Test1!')).toBe(false);
    });

    it('should return false for password longer than 15 characters', () => {
        expect(isValidPassword('ThisIsASuperLongPassword1!')).toBe(false);
    });
});

describe('obfuscateEmail', () => {
    it('should obfuscate email address correctly', () => {
        expect(obfuscateEmail('test@example.com')).toBe('t**t@example.com');
    });

    it('should return empty string when email is null', () => {
        expect(obfuscateEmail(null)).toBe('');
    });

    it('should handle emails without domain', () => {
        expect(obfuscateEmail('test@')).toBe('t**t@');
    });
});

describe('obfuscatePhone', () => {
    it('should obfuscate phone number correctly', () => {
        expect(obfuscatePhone(stripNonNumericCharacters('123-456-7890'))).toBe('12******90');
    });

    it('should return empty string when phone is null', () => {
        expect(obfuscatePhone(null)).toBe('');
    });

    it('should handle short phone numbers', () => {
        expect(obfuscatePhone(stripNonNumericCharacters('23-45-6789'))).toBe('23****89');
    });
});

describe('sanitizeInput', () => {
    it('should sanitize HTML correctly', () => {
        const input = '<script>alert("xss")</script><b>Bold</b>';
        expect(sanitizeInput(input)).toBe('<b>Bold</b>');
    });

    it('should return empty string for null input', () => {
        expect(sanitizeInput(null)).toBe('');
    });

    it('should return sanitized empty string for undefined input', () => {
        expect(sanitizeInput(undefined)).toBe('');
    });
});

describe('getFileExtByMimeType', () => {
    it('should return .jpg for image/jpeg mime type', () => {
        expect(getFileExtByMimeType('image/jpeg')).toBe('.jpg');
    });

    it('should return .png for image/png mime type', () => {
        expect(getFileExtByMimeType('image/png')).toBe('.png');
    });

    it('should return .mp4 for video/mp4 mime type', () => {
        expect(getFileExtByMimeType('video/mp4')).toBe('.mp4');
    });

    it('should throw error for unknown mime type', () => {
        expect(() => getFileExtByMimeType('application/pdf')).toThrowError('Unknown mime type');
    });
});

describe('getPostIdFromEsId', () => {
    it('should return post id when a valid esId is provided', async () => {
        // Mock the result of DBConnector.getGraph().V()...
        const mockIdMethod = jest.fn().mockReturnThis();

        const mockNext = jest.fn().mockResolvedValueOnce({
            value: new Map([['id', '123']]), // Simulate the result with a valid post id
        });

        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            hasLabel: jest.fn().mockReturnThis(),
            has: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            next: mockNext, // Mock the next method
        });

        DBConnector.__ = jest.fn().mockReturnValue({
            id: mockIdMethod, // Return the mock id method
        });

        const result = await getPostIdFromEsId('someEsId');
        expect(result).toBe('123');
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockIdMethod).toHaveBeenCalledTimes(1); // Ensure id() is called
    });

    it('should throw an error if there is an issue fetching post likes', async () => {
        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            hasLabel: jest.fn().mockReturnThis(),
            has: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            next: jest.fn().mockRejectedValueOnce(new Error('Error getting post likes')),
        });

        // Mock DBConnector.__() to avoid issues in the chain
        DBConnector.__ = jest.fn().mockReturnValue({
            id: jest.fn(), // Empty mock for id()
        });

        await expect(getPostIdFromEsId('someEsId')).rejects.toThrow('Error getting post likes');
    });

    it('should return null if no post is found for the given esId', async () => {
        // Mock DBConnector to simulate no result found
        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            hasLabel: jest.fn().mockReturnThis(),
            has: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            next: jest.fn().mockResolvedValueOnce({ value: null }),
        });

        // Mock DBConnector.__() to avoid issues in the chain
        DBConnector.__ = jest.fn().mockReturnValue({
            id: jest.fn(), // Empty mock for id()
        });

        const result = await getPostIdFromEsId('someEsId');
        expect(result).toBeNull();
    });

    it('should throw an error if the result is null (missing esId or something went wrong)', async () => {
        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            hasLabel: jest.fn().mockReturnThis(),
            has: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            next: jest.fn().mockResolvedValueOnce(null), // Simulate null result
        });

        // Mock DBConnector.__() to avoid issues in the chain
        DBConnector.__ = jest.fn().mockReturnValue({
            id: jest.fn(), // Empty mock for id()
        });

        await expect(getPostIdFromEsId('someEsId')).rejects.toThrow('Error getting post likes');
    });

    it('should return the correct post id when there is a result', async () => {
        // Simulate a valid response from DBConnector
        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            hasLabel: jest.fn().mockReturnThis(),
            has: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            next: jest.fn().mockResolvedValueOnce({
                value: new Map([['id', '987']]), // Simulate valid post id
            }),
        });

        // Mock DBConnector.__() to avoid issues in the chain
        DBConnector.__ = jest.fn().mockReturnValue({
            id: jest.fn(), // Mock id method
        });

        const result = await getPostIdFromEsId('validEsId');
        expect(result).toBe('987');
    });
});

describe('getLikesByPost', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return an empty array when postId is null or empty', async () => {
        const result = await getLikesByPost(null);
        expect(result).toEqual([]);
    
        const resultEmpty = await getLikesByPost('');
        expect(resultEmpty).toEqual([]);
    });   

    it('should return an array of likes for valid postId', async () => {
        // Mock the DBConnector to simulate database query
        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            inE: jest.fn().mockReturnThis(),
            outV: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            toList: jest.fn().mockResolvedValue([
                new Map([
                    ['userId', "1234"],
                    ['userName', 'user1'],
                    ['profileId', 'profile1']
                ]),
            ]),
        });
        DBConnector.__ = jest.fn().mockReturnValue({
            id: jest.fn().mockReturnValue('1234')
        });

        const result = await getLikesByPost('postId');
        expect(result).toEqual([{ userId: '1234', userName: 'user1', profileId: 'profile1' }]);
    });

    it('should return empty array if no likes are found', async () => {
        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            inE: jest.fn().mockReturnThis(),
            outV: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            toList: jest.fn().mockResolvedValue([]),
        });

        const result = await getLikesByPost('postId');
        expect(result).toEqual([]);
    });

    it('should throw an error if there is an issue fetching likes', async () => {
        DBConnector.getGraph = jest.fn().mockReturnValue({
            V: jest.fn().mockReturnThis(),
            inE: jest.fn().mockReturnThis(),
            outV: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            by: jest.fn().mockReturnThis(),
            toList: jest.fn().mockRejectedValue(new Error('Error getting post likes')),
        });

        await expect(getLikesByPost('postId')).rejects.toThrow('Error getting post likes');
    });
});

describe('handleValidationError', () => {
    it('should set status code and body in the context', () => {
        const ctx: Context = {
            status: 0,
            body: {},
        } as Context;

        handleValidationError(ctx, 'Invalid Input', 400);

        expect(ctx.status).toBe(400);
        expect(ctx.body).toEqual({ status: 'Invalid Input' });
    });
});