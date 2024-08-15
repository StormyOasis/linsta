import '@testing-library/jest-dom';
import {validateEmailPhone, validateFullName, validatePassword} from '../utils';


describe("Test utility functions", ():any => {
    it("Should return true for valid email", ():any=> {
        const result = validateEmailPhone("abc@efg.com");
        expect(result).toBeTruthy();
    })

    it("Should return true for valid phone", ():any=> {
        const result = validateEmailPhone("+15555555555");
        expect(result).toBeTruthy();
    })
    
    it("Should return false for invalid email or phone", ():any=> {
        const result = validatePassword("bad email or phone");
        expect(result).toBeFalsy();
    })     

    it("Should return true for valid password", ():any=> {
        const result = validatePassword("Pa$$w0rd!");
        expect(result).toBeTruthy();
    })

    it("Should return false for invalid password", ():any=> {
        const result = validatePassword("bad password");
        expect(result).toBeFalsy();
    }) 
    
    it("Should return true for valid full name", ():any=> {
        const result = validateFullName("First Middle Last");
        expect(result).toBeTruthy();
    })

    it("Should return false for invalid full name", ():any=> {
        const result = validateFullName("");
        expect(result).toBeFalsy();
    })      
});