import React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import StyledLink from "./StyledLink";

const ModalWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  position: relative;
  pointer-events: all;
  z-index: 99999;
  border: none;
  box-sizing: content-box;
`;

const ModalInnerWrapper = styled.div`
  animation-duration: 0.15s;
  animation-iteration-count: 1;
  animation-timing-function: ease-out;
  animation-name: modalAnimation;
  display: block;
  flex-shrink: 1;
  margin: 20px;
  max-width: ${props => props.theme['sizes'].modalWidth};
  max-height: calc(100% - 40px);
  min-width: 260px;
  pointer-events: all;
  position: relative;
  width: ${props => props.theme['sizes'].modalWidth};;
  border-radius: 12px;
  background-color: ${props => props.theme['colors'].backgroundColor};
`;

const ModalInnerWrapper2 = styled.div`  
  display: block;
  overflow: auto;
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
  width: ${props => props.theme['sizes'].modalWidth};
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
  width: ${props => props.theme['sizes'].modalWidth};
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

export const ModalContentWrapper = styled.div`
    align-content: stretch;
    align-items: center;
    border: none;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    justify-content: flex-start;
    overflow: visible;
    pointer-events: all;
    position: relative;
    margin: 20px 28px 20px 28px;
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


export const EnableModal = (enable: boolean) => {
  const cont = document.getElementById("modalContainer");
  const sectionCont = document.getElementById("mainSectionContainer");

  if (cont && sectionCont) {
    if (enable) {
      cont.style.height = "100%";
      sectionCont.style.pointerEvents = "none";
    }
    else {
      cont.style.height = "0%";
      sectionCont.style.pointerEvents = "auto";
    }
  }
}

export type MultiStepModalProps = {
  steps: Array<{ title: string, options: any, element: JSX.Element, onNext?: any, onPrev?: any }>;
  onClose: any;
  stepNumber: number;
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

  onClose = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.props.onClose && this.props.onClose(event);
    EnableModal(false);
  };

  override componentDidMount(): void {
    EnableModal(true);
  }

  override render() {
    const cont = document.getElementById("modalContainer");
    if (cont == null) {
      throw new Error("No modal container");
    }

    const step = this.props.steps[this.props.stepNumber];

    return createPortal(
      <>
        <ModalWrapper role="dialog">
          <ModalInnerWrapper>
            <ModalInnerWrapper2>
              <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: "100%" }}>
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
                          <div style={{ alignItems: "center", display: "flex", justifyContent: "center", cursor: "pointer" }}>
                            <CloseButton />
                          </div>
                        </ModalCloseButton>
                      </ModalClose>
                    </ModalCloseWrapper>
                  </ModalTitleBarInnerWrapper>
                </ModalTitleBarWrapper>
                <ModalContentWrapper>
                  {step.element}
                </ModalContentWrapper>
              </div>
              {step.options.showFooter &&
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