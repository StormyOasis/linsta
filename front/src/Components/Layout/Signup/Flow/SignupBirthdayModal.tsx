import React from "react";

import { Div } from "../../../Common/CombinedStyling";
import MultiStepModal, { ModalContentWrapper, ModalSectionWrapper } from "../../../Common/MultiStepModal";

type SignupBirthdayModalProps = {
    onClose: () => void;
    zIndex: number;
}

const SignupBirthdayModalContent: React.FC = () => {
    return (
        <ModalContentWrapper $alignItems="center" $maxWidth="350px">
            <ModalSectionWrapper style={{padding: "4px" }}>
                <Div $height="96px" $width="141px" $backgroundImage="url('/public/images/birthday_cake.png')"></Div>                
            </ModalSectionWrapper>
            <ModalSectionWrapper $marginTop="4px" style={{padding: "8px" }}>
                <Div $position="relative" $overflow="visible" $textWrap="wrap" $fontSize="20px" $lineHeight="25px">
                    Birthdays on Linstagram 
                </Div>
            </ModalSectionWrapper>
            <ModalSectionWrapper $marginTop="4px" style={{padding: "8px" }}>
                <Div $position="relative" $overflow="visible" $textWrap="wrap" $textAlign="center">
                    Providing your birthday improves the features and ads you see, and helps us keep the Linstagram community safe. You can find your birthday in your personal information account settings.
                </Div>                                
            </ModalSectionWrapper>
        </ModalContentWrapper>                 
    );
}

export const SignupBirthdayModal: React.FC<SignupBirthdayModalProps> = (props: SignupBirthdayModalProps) => {
    const steps = [
        {
            title: "Birthdays on Linstagram",
            element: <SignupBirthdayModalContent />,
            options: {
                showFooter: false,            
            },
        }
    ];

    return (
        <MultiStepModal zIndex={props.zIndex} steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
    );
}

export default SignupBirthdayModal;