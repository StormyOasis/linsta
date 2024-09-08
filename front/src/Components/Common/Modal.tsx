import React from "react";
import { createPortal } from "react-dom";
import { enableModal } from "../../utils/utils";
import styled from "styled-components";

export type ModalProps = {
  children?: any;
  title?: string;
  onClose: any;
};

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
  max-width: ${props => props.theme['sizes'].maxModalWidth};
  max-height: calc(100% - 40px);
  min-width: 260px;
  pointer-events: all;
  position: relative;
  width: ${props => props.theme['sizes'].defaultModalWidth};
  border-radius: 12px;
  background-color: white;
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
  border-bottom: 1px solid rgb(220, 220, 220);
  height: 42px;
  pointer-events: all;
  position: relative;
  width: ${props => props.theme['sizes'].defaultModalWidth};
  max-width: width: ${props => props.theme['sizes'].maxModalWidth};
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
  width: ${props => props.theme['sizes'].defaultModalWidth};
  max-width: width: ${props => props.theme['sizes'].maxModalWidth};
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
  background-color: white;
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
    align-items: stretch;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    justify-content: flex-start;
    overflow: visible;
    position: relative;
    pointer-events: all;
`;

export default class Modal extends React.Component<ModalProps> {
  onClose = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.props.onClose && this.props.onClose(event);
    enableModal(false);
  };

  override componentDidMount(): void {
    enableModal(true);
  }

  override render() {
    const cont = document.getElementById("modalContainer");
    if(cont == null) {
      throw new Error("No modal container");
    }

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
                        <div>{this.props.title}</div>
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
                  {this.props.children}
                </ModalContentWrapper>
              </div>
            </ModalInnerWrapper2>
          </ModalInnerWrapper>
        </ModalWrapper>
      </>
    , cont);
  }
}