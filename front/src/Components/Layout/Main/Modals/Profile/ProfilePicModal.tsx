import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useDropzone } from "react-dropzone";
import MultiStepModal from "../../../../Common/MultiStepModal";
import { Profile } from "../../../../../api/types";
import { putSubmitPfp } from "../../../../../../src/api/ServiceController";
import { getPfpFromProfile } from "../../../../../utils/utils";
import { Div, Flex, FlexColumnFullWidth } from "../../../../../Components/Common/CombinedStyling";
import StyledLink from "../../../../../Components/Common/StyledLink";
import { actions, useAppDispatch } from "../../../../../Components/Redux/redux";

type PfpModalProps = {
    onClose: () => void;
    profile: Profile;
    zIndex: number;
}

type PfpModalContentProps = {
    onClose: () => void;
    profile: Profile;
}

type UpdatedPfpData = {
    file: File;
    fileName: string;
}

const CustomStyledLink = styled(StyledLink) <{ $optionNum: number }>`
    font-weight: ${props => props.$optionNum === 2 ? 400 : 600};
    color:  ${props => props.$optionNum === 0 ? "auto" : props.$optionNum === 1 ? 
            props => props.theme['colors'].warningTextColor : props => props.theme['colors'].defaultTextColor};
    
    &:hover {
        color:  ${props => props.$optionNum === 0 ? "auto" : props.$optionNum === 1 ? 
            props => props.theme['colors'].warningTextColor : props => props.theme['colors'].defaultTextColor};    
    }
`;

const OptionDiv = styled(Div)`
    cursor: pointer;
    border-top: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    min-height: 40px;
    width: 100%;
    align-content: center;

    &:hover {
        background-color:  ${props => props.theme['colors'].buttonSecondaryOnHoverColor};    
    }    
`;

const HeaderDiv = styled(Div)`    
    display: grid;
    width: 100%;
    align-content: center;    
    margin-top: 16px;
`;

const ProfilePicWrapper = styled(Flex)`
    border-radius: 50%;
    height: 64px;
    width: 64px;
    object-fit: contain;
    justify-self: center;
`;

const HeaderTextDiv = styled(Div)`
    margin: 10px;
    line-height: 25px;
    font-size: 16px;
    font-weight: 400;
`;

const PfpImg = styled.img`
    border-radius: 50%;
    max-width: 64px;
    max-height: 64px;
    object-fit: contain;
`;    

const PfpModalContent: React.FC<PfpModalContentProps> = (props: PfpModalContentProps) => {
    const [isUpdated, setIsUpdated] = useState<boolean>(false);
    const [newPfpUrl, setNewPfpUrl] = useState<UpdatedPfpData | null>(null);

    const dispatch = useAppDispatch();

    useEffect(() => {
        return () => {
            if (newPfpUrl?.fileName) {
                URL.revokeObjectURL(newPfpUrl.fileName);
            }
        };
    }, [newPfpUrl]);

    const { getRootProps, getInputProps, open } = useDropzone({
        noClick: true,
        noKeyboard: true,
        noDrag: true,
        maxFiles: 1,
        accept: { 
            "image/png": ['.png'], 
            "image/jpeg": ['.jfi', '.jfif', '.jif', '.jpe', '.jpeg', '.jpg', '.pjpg']
        },
        onDrop: async (acceptedFiles, _fileRejections) => {
            if(acceptedFiles.length === 1) {
                const file:File = acceptedFiles[0];
                setNewPfpUrl({file, fileName: URL.createObjectURL(file)});
                setIsUpdated(true);         
            }
        }
    });

    const handleUploadOkClick = async () => {
        if(isUpdated) {
            const result = await putSubmitPfp(newPfpUrl?.file, props.profile.userId);

            if(result.status === 200) {                    
                setNewPfpUrl(result.data.url);
                dispatch(actions.profileActions.updateProfilePic(result.data.url));
                
                props.onClose();
            }
        } else {
            open();
        }
    }

    const handleRemovePfp = async () => {
        await putSubmitPfp("", props.profile.userId);

        setIsUpdated(false);
        dispatch(actions.profileActions.updateProfilePic(null));
        props.onClose();
    }

    return (
        <>
            <FlexColumnFullWidth $textAlign="center">
                <div {...getRootProps({ className: 'dropzone' })} >
                    <input {...getInputProps()} />                
                    <HeaderDiv>
                        <ProfilePicWrapper>
                            {props.profile && <PfpImg
                                src={isUpdated ? `${newPfpUrl?.fileName}` : getPfpFromProfile(props.profile)}
                                alt={`${props.profile.userName}'s profile picture`}
                                aria-label={`${props.profile.userName}'s profile picture`} />
                            }
                        </ProfilePicWrapper>
                        <HeaderTextDiv>Update Profile Photo</HeaderTextDiv>                    
                    </HeaderDiv>
                </div>
                <OptionDiv onClick={handleUploadOkClick}>
                    <CustomStyledLink $optionNum={0}>
                        {!isUpdated ? `Upload Photo` : `Ok`}
                    </CustomStyledLink>
                </OptionDiv>
                <OptionDiv onClick={handleRemovePfp}>
                    <CustomStyledLink $optionNum={1}>
                        Remove Current Photo
                    </CustomStyledLink>
                </OptionDiv>
                <OptionDiv onClick={props.onClose}>
                    <CustomStyledLink $optionNum={2}>
                        Cancel
                    </CustomStyledLink>
                </OptionDiv>
            </FlexColumnFullWidth>
        </>
    );
}

const PfpModal: React.FC<PfpModalProps> = (props: PfpModalProps) => {

    const steps = [
        {
            title: "Change Profile Photo",
            element: <PfpModalContent profile={props.profile} onClose={props.onClose}/>,
            options: {
                showFooter: false,
                hideHeader: true,
                hideMargins: true
            },
        }
    ];

    return (
        <>
            <MultiStepModal zIndex={props.zIndex} steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
        </>
    );
}

export default PfpModal;