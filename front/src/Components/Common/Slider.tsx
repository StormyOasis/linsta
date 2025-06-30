import React from 'react';
import { styled } from "styled-components";
import { Flex } from './CombinedStyling';

export type SliderProps = {
    value: number;
    min: number;
    max: number;
    step: number;
    labelledby?: string;
    label?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SliderWrapper = styled(Flex)`
    justify-content: flex-end;
    margin-top: 20px;
    margin-right: 10px;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {    
        width:100%;
        margin-right: 0px;
        justify-content: center;        
    }
`;

const Slider: React.FC<SliderProps> = (props: SliderProps) => {

    return (
        <>
            <SliderWrapper>
                <label style={{display: "inline-flex", fontWeight: 500}}>
                    {props.label}
                    <input 
                        type="range" 
                        aria-labelledby={props.labelledby} 
                        value={props.value} 
                        min={props.min} 
                        max={props.max} 
                        step={props.step} 
                        onChange={props.onChange}
                        style={{marginLeft: "10px"}}
                    />
                </label>
            </SliderWrapper>
        </>
    );
}

export default Slider;