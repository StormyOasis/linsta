import {
    stripNonNumericCharacters,
    isEmail,
    isPhone,
    isValidPassword,
    obfuscateEmail,
    obfuscatePhone,
    sanitize,    
    getFileExtByMimeType,
    convertSingleToDoubleQuotes,    
    isHashtag,
    isMention,
    extractHashtags,
    extractHashtagsAndMentions,
    extractFromMultipleTexts,
} from '../textUtils';

describe('textUtils', () => {
    describe('stripNonNumericCharacters', () => {
        it('should remove all non-numeric characters', () => {
            expect(stripNonNumericCharacters('abc123!@#456')).toBe('123456');
        });
    });

    describe('isEmail', () => {
        it('should return true for valid email', () => {
            expect(isEmail('test@example.com')).toBe(true);
        });

        it('should return false for invalid email', () => {
            expect(isEmail('invalid-email')).toBe(false);
        });
    });

    describe('isPhone', () => {
        it('should return true for valid phone number', () => {
            expect(isPhone('1234567890')).toBe(true);
        });

        it('should return false for invalid phone number', () => {
            expect(isPhone('abc123')).toBe(false);
        });
    });

    describe('isValidPassword', () => {
        it('should return true for valid password', () => {
            expect(isValidPassword('Password1!')).toBe(true);
        });

        it('should return false for invalid password', () => {
            expect(isValidPassword('password')).toBe(false);
        });
    });

    describe('obfuscateEmail', () => {
        it('should obfuscate email correctly', () => {
            expect(obfuscateEmail('test@example.com')).toBe('t**t@example.com');
        });

        it('should return an empty string for null email', () => {
            expect(obfuscateEmail(null)).toBe('');
        });
    });

    describe('obfuscatePhone', () => {
        it('should obfuscate phone number correctly', () => {
            expect(obfuscatePhone('1234567890')).toBe('12******90');
        });

        it('should return an empty string for null phone', () => {
            expect(obfuscatePhone(null)).toBe('');
        });
    });

    describe('sanitize', () => {
        it('should sanitize HTML input', () => {
            const input = '<script>alert("XSS")</script><b>bold</b>';
            expect(sanitize(input)).toBe('<b>bold</b>');
        });
    });

    describe('getFileExtByMimeType', () => {
        it('should return correct file extension for known mime types', () => {
            expect(getFileExtByMimeType('image/jpeg')).toBe('.jpg');
            expect(getFileExtByMimeType('video/mp4')).toBe('.mp4');
        });

        it('should throw an error for unknown mime types', () => {
            expect(() => getFileExtByMimeType('unknown/type')).toThrow('Unknown mime type');
        });
    });

    describe('convertSingleToDoubleQuotes', () => {
        it('should convert single quotes to double quotes', () => {
            expect(convertSingleToDoubleQuotes(`{'key': 'value'}`)).toBe(`{"key": "value"}`);
        });
    });

    describe('extractHashtags', () => {
        it('should extract hashtags from text', () => {
            expect(extractHashtags('This is a #test with #hashtags')).toEqual(['#test', '#hashtags']);
        });

        it('should return an empty array if no hashtags are found', () => {
            expect(extractHashtags('No hashtags here')).toEqual([]);
        });
    });

    describe('extractHashtagsAndMentions', () => {
        it('should extract hashtags and mentions from text', () => {
            const text = 'This is a #test with @mentions and #hashtags';
            expect(extractHashtagsAndMentions(text)).toEqual({
                hashtags: ['#test', '#hashtags'],
                mentions: ['@mentions'],
            });
        });

        it('should return empty arrays if no hashtags or mentions are found', () => {
            expect(extractHashtagsAndMentions('No hashtags or mentions')).toEqual({
                hashtags: [],
                mentions: [],
            });
        });
    });

    describe('extractFromMultipleTexts', () => {
        it('should extract unique hashtags and mentions from multiple texts', () => {
            const texts = [
                'This is a #test with @mentions',
                'Another #test with @differentMention',
            ];
            expect(extractFromMultipleTexts(texts)).toEqual({
                hashtags: ['#test'],
                mentions: ['@mentions', '@differentmention'],
            });
        });
    });

    describe('isHashtag', () => {
        it('should return true for valid hashtags', () => {
            expect(isHashtag('#test')).toBe(true);
        });

        it('should return false for invalid hashtags', () => {
            expect(isHashtag('test')).toBe(false);
        });
    });

    describe('isMention', () => {
        it('should return true for valid mentions', () => {
            expect(isMention('@user')).toBe(true);
        });

        it('should return false for invalid mentions', () => {
            expect(isMention('user')).toBe(false);
        });
    });
});