import '@testing-library/jest-dom';
import {validatePassword} from '../utils';


describe("Test utility functions", ():any => {
    it("Should return true for valid email", ():any=> {
        const result = validatePassword("Pa$$w0rd!");
        expect(result).toBeTruthy();
    })
    it("Should return false for invalid email", ():any=> {
        const result = validatePassword("bad password");
        expect(result).toBeFalsy();
    })    
});