import React, { useState } from "react";
import { styled } from "styled-components";

const SwitchLabel = styled.label`
  display: flex;
  position: relative;
  justify-content: space-between;
  background: ${props => props.theme['colors'].borderDarkColor};
  align-items: center;  
  width: 64px;
  height: 24px;    
  cursor: pointer;  
  border-radius: 50px;  
  transition: background-color 0.2s;

  &:active span {
    width: 40px;
  }
`;

const SwitchInput = styled.input`
  height: 0;
  width: 0;
  visibility: hidden;

  &:checked + label {
    background: ${props => props.theme['colors'].buttonDefaultColor};
  }

  &:checked + label span {
    left: calc(100% - 2px);
    transform: translateX(-100%);    
    background: ${props => props.theme['colors'].backgroundColor};
  }
`;

const SwitchSliderSpan = styled.span`
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  transition: 0.2s;
  background: ${props => props.theme['colors'].backgroundColor};
`;

type ToggleSwitchProps = {
    isChecked?: boolean;
    onChange?: (isChecked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = (props: ToggleSwitchProps) => {
    const [isChecked, setIsChecked] = useState(props.isChecked || false);
     //since it's an id, make sure it's unique in case there's multiple toggles on same page
    const [id, _setId] = useState(crypto.randomUUID());

    const handleChange = (_event: any) => {
        const checked = !isChecked;
        setIsChecked(checked);
        if(props.onChange) {
            props?.onChange(checked);
        }        
    }

    return (
        <>
            <SwitchInput id={id} type="checkbox" onChange={handleChange} checked={isChecked}></SwitchInput>
            <SwitchLabel htmlFor={id}>            
                <SwitchSliderSpan>
                </SwitchSliderSpan>
            </SwitchLabel>            
        </>
    );
};

export default ToggleSwitch;