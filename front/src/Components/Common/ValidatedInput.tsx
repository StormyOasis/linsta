import { styled } from "styled-components";
import { Div } from "./CombinedStyling";
import { Icon } from "./Icon";
import * as styles from "./Common.module.css";

type ValidatedProps = {
    isValid: boolean;
    children: React.ReactNode;
};

const ValidationWrapper = styled(Div)`
    position: relative;
    width: 100%;
`;

const ValidationIcon = styled(Icon)`
    position: absolute;
    right: 10px;
    top: 6px;
    width: 16px;
    height: 16px;
    color: currentColor;

    & use {
        fill: currentColor;
    }
`;

export const ValidatedInput: React.FC<ValidatedProps> = (props: ValidatedProps) => {
    const validationClass = props.isValid ? styles.validationPass : styles.validationFail;    
    return (
        <ValidationWrapper>
            {props.children}
            <ValidationIcon name={props.isValid ? 'check-circle' : 'x-circle'} className={validationClass} />
        </ValidationWrapper>
    );
};