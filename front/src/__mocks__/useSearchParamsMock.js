import { useState } from 'react';

let mockSearchParams = '';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useSearchParams: () => {        
        return [
          new URLSearchParams(mockSearchParams),
          (newParams) => {
            mockSearchParams = newParams
          }
        ]
      }
}));