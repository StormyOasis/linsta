import React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import StyledLink from "./StyledLink";
import { Flex, FlexColumn } from "./CombinedStyling";

const ModalWrapper = styled.div`
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    position: absolute;
    pointer-events: all;
    border: none;
    box-sizing: content-box;
    left: 50%;
    top: 10px;
    transform: translateX(-50%);
    width:100%;
`;

const ModalInnerWrapper = styled.div`
    animation-duration: 0.15s;
    animation-iteration-count: 1;
    animation-timing-function: ease-out;
    animation-name: modalAnimation;
    display: block;
    flex-shrink: 1;
    margin: 20px;
    max-width: ${props => props.theme['sizes'].maxModalWidth};
    max-height: calc(100% - 40px);
    min-width: 260px;
    overflow: hidden;
    pointer-events: all;
    position: relative;
    border-radius: 12px;
    background-color: ${props => props.theme['colors'].backgroundColor};
`;

const ModalInnerWrapper2 = styled.div`  
    display: block;
    overflow: hidden;
    pointer-events: all;
`;

const ModalTitleBarWrapper = styled.div`
    align-items: stretch;
    display: flex;
    flex-direction: column;
    pointer-events: all;
`;

const ModalTitleBarInnerWrapper = styled.div`
    align-items: center;
    display: block;
    border-bottom: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    height: 42px;
    pointer-events: all;
    position: relative;
    width: 100%;
`;

const ModalTitleBarInnerWrapper2 = styled.div`
    align-content: stretch;
    align-items: center;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    height: 42px;
    justify-content: center;
    overflow: visible;
    pointer-events: all;
    width: 100%;
    position: absolute;
`;

const ModalTitle = styled.div`
    align-items: center;
    display: flex;
    flex-direction: column;
    flex-grow: 1
    font-size: 16px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
    justify-content: center; 
    width: calc(100%-100); 
`;

const ModalCloseWrapper = styled.div`
    align-items: center;
    display: flex;
    flex-basis: 48px;
    flex-direction: column;
    float: right;
    height: 42px;
    justify-content: center;
    pointer-events: all;
    position: relative;
`;

const ModalClose = styled.div`
    align-content: stretch;
    align-items: stretch;
    border: none;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: visible;
    padding: 0 8px;
    pointer-events: all;
    position: relative;
`;

const ModalCloseButton = styled.button`
    align-items: center;
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: center;
    pointer-events: all;
    text-align: center;
`;

const CloseButton = styled.span`
    width: 12px;
    height: 12px;
    margin-right: 5px;
    background: url('/public/images/x.svg');
`;

export const ModalContentWrapper = styled.div<{ $hideMargins?: boolean | undefined, $alignItems: string }>`
    align-content: stretch;
    align-items: ${props => props.$alignItems};
    border: none;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    justify-content: flex-start;
    overflow: visible;
    pointer-events: all;
    position: relative;
    margin: ${props => props.$hideMargins ? 0 : "20px 28px 20px 28px"};
`;

export const ModalSectionWrapper = styled.div`
    align-content: stretch;
    align-items: center;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    justify-content: flex-start;
    overflow: visible;
    position: relative;
    pointer-events: all;
`;

const ModalFooter = styled.div`
    padding: 10px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    border-top: 1px solid ${props => props.theme['colors'].borderDefaultColor};
`;

const PrevButton = styled.div`
    background: url('/public/images/backarrow.svg') no-repeat;
    cursor: pointer;
    height: 17px;
    width: 22px;
`;

export type MultiStepModalStepOptions = {
    showFooter?: boolean;
    hideMargins?: boolean;
    footerNextPageText?: string;
    alignItems?: string;
}

export type MultiStepModalProps = {
    steps: Array<{ title: string, options: MultiStepModalStepOptions, element: JSX.Element, onNext?: any, onPrev?: any }>;
    onClose: any;
    stepNumber: number;
    showLoadingAnimation: boolean;
    zIndex: number;
};

type MultiStepModalState = {
};

export default class MultiStepModal extends React.Component<MultiStepModalProps, MultiStepModalState> {

    constructor(props: MultiStepModalProps) {
        super(props);

        if (props.steps.length === 0 || props.stepNumber < 0 || props.stepNumber >= props.steps.length) {
            throw new Error("Invalid multi step modal length");
        }
    }

    onClose = (event: React.MouseEvent<HTMLButtonElement>) => {
        this.props.onClose && this.props.onClose(event);
    };

    override componentDidMount(): void {
    }

    override render() {
        const cont = document.getElementById("modalOverlay");
        if (cont === null) {
            return null;
        }
        
        const step = this.props.steps[this.props.stepNumber];
        const alignItems = step.options.alignItems ? step.options.alignItems : "center";

        return createPortal(
            <>
                <ModalWrapper role="dialog" style={{zIndex: this.props.zIndex}}>
                    <ModalInnerWrapper>
                        <ModalInnerWrapper2>
                            <FlexColumn $height="100%">
                                <ModalTitleBarWrapper>
                                    <ModalTitleBarInnerWrapper>
                                        <ModalTitleBarInnerWrapper2>
                                            <ModalTitle>
                                                <div>{step.title}</div>
                                            </ModalTitle>
                                        </ModalTitleBarInnerWrapper2>
                                        <ModalCloseWrapper>
                                            <ModalClose>
                                                <ModalCloseButton title="data-modal-close" aria-label="Close" onClick={this.onClose}>
                                                    <Flex $alignItems="center" $justifyContent="center" $cursor="pointer">
                                                        <CloseButton />
                                                    </Flex>
                                                </ModalCloseButton>
                                            </ModalClose>
                                        </ModalCloseWrapper>
                                    </ModalTitleBarInnerWrapper>
                                </ModalTitleBarWrapper>
                                <ModalContentWrapper $hideMargins={step.options.hideMargins} $alignItems={alignItems}>
                                    {this.props.showLoadingAnimation &&
                                        <div>
                                            <img src="/public/images/loading.gif" />
                                        </div>
                                    }
                                    {!this.props.showLoadingAnimation && step.element}
                                </ModalContentWrapper>
                            </FlexColumn>
                            {(step.options.showFooter && !this.props.showLoadingAnimation) &&
                                <ModalFooter>
                                    <PrevButton onClick={step?.onPrev} />
                                    <StyledLink to="#" onClick={step?.onNext}>{step.options.footerNextPageText}</StyledLink>
                                </ModalFooter>
                            }
                        </ModalInnerWrapper2>
                    </ModalInnerWrapper>
                </ModalWrapper>
            </>, cont);
    }
}