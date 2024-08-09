import React from "react";
import { styled } from "styled-components";

import * as styles from "/src/Components/Common/Common.module.css";
import Theme from "/src/Components/Themes/Theme";

const StyledInputWrapper = styled.div`
  display: flex;
  flex-direction: row;
  margin: 0 40px 5px 40px;
`;

const StyledInputInput = styled.input`
  border: 2px solid ${props => props.theme['colors'].borderDefaultColor};
  background-color: ${props => props.theme['colors'].inputBackgroundColor};
  display: block;
  width: 100%;
  height: 24px;
`;

const StyledInputLabel = styled.label`
    position: relative;
    width: 100%;
`;

type StyledInputProps = {
  name: string;
  value?: string | Number;
  placeholder?: string;
  isValid?: boolean;
  onChange?: any;
  type?: string;
  maxLength?: number;
  style?: any;
}

const StyledInput: React.FC<StyledInputProps> = (props: StyledInputProps) => {

    // Determine validation classname (None, valid, invalid)
    const value = `${props.value}`;
    let validationClass = "";
    if(value.length != 0) {
      validationClass = props.isValid ? styles.validationPass : styles.validationFail;
    }

    return (
      <Theme>
        <StyledInputWrapper>
          <StyledInputLabel className={validationClass}>
              <StyledInputInput
                  style={props.style}
                  type={props.type}
                  name={props.name}
                  value={value}
                  placeholder={props.placeholder}
                  onChange={props.onChange} 
                  maxLength={props.maxLength ? props.maxLength : 255}
                  />
          </StyledInputLabel>
        </StyledInputWrapper>        
      </Theme>
    );
}

export default StyledInput;