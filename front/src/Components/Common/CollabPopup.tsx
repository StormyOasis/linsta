import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import CollabInputSVG from "/public/images/collaboration.svg";
import { Div, FlexColumn, FlexRow } from "./CombinedStyling";

import useThrottle from '../../utils/useThrottle';
import { CollabData, Profile } from '../../api/types';
import LoadingImage from './LoadingImage';
import { getSuggestions } from '../../api/ServiceController';
import PopupDropdownSelector from './PopupDropdownSelector';
import ProfileLink from './ProfileLink';
import Checkbox from './Checkbox';
import StyledButton from './StyledButton';
import { buildCollabSearchText } from '../../utils/utils';

const SVGContainer = styled(Div)`
    width: 24px;
    height: 24px;
    align-content: center;
    justify-content: center;
`;

const PopupSVGContainer = styled(Div)`
    width: 64px;
    height: 64px;
    justify-content: center;
    justify-self: center;
`;

const CollaboratorHeading = styled(Div)`
    align-self: center;
    font-size: 16px;
    width: 100%;
    height: 100%;
    padding-top: 32px;
    font-weight: 500;
    text-align: center;
`;

const CollaboratorSubHeading = styled(Div)`
    color: ${props => props.theme['colors'].mediumTextColor};
    font-size: 12px;
    width:100%;
    height: 100%;
    padding-top: 32px;
    text-align: center;
`;

const CollabPopupContainer = styled(Div) <{ $isOpen: boolean }>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    position: fixed;
    top: 64px;
    width: 20%;
    height: 40%;
    z-index: 9;
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
    overflow-y: auto;
    overflow-x: clip;
`;

const ProfileLinkWrapper = styled(FlexRow)`
    justify-content: space-between;
    padding-top: 5px;
    padding-bottom: 5px;
    cursor: pointer;
    &:hover {
        background-color: ${props => props.theme['colors'].buttonDefaultSecondaryColor};
    }
`;

const Divider = styled(Div)`
    width: 100%;
    border-bottom: 2px solid ${props => props.theme['colors'].borderDefaultColor};
`;

const DoneButtonWrapper = styled(Div)`
    position: sticky;
    bottom: 0;
    background-color: ${props => props.theme['colors'].backgroundColor};
`;

const DoneButton = styled(StyledButton)`
    width: 100%;
    margin: 0;
`;

type CollabProps = {
    searchText: string;
    collabData: CollabData;
    onCollabChanged: (data: CollabData) => void;
}

const CollabPopup: React.FC<CollabProps> = (props: CollabProps) => {
    const [searchText, setSearchText] = useState<string>(props.searchText);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [profilesFromService, setProfilesFromService] = useState<Record<string, Profile>>({});
    const dropdownRef = useRef<{ close: () => void } | null>(null);

    useEffect(() => {
        // On mount populate the profilesFromService array with what's in collabData
        setProfilesFromService(props.collabData.selectedProfiles);

        // Also populate the input text
        setSearchText(buildCollabSearchText(props.collabData.selectedProfiles));
    }, []);

    const throttledCollabTextChange = useThrottle(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.currentTarget.value.trim();
        setSearchText(inputValue);        

        if (inputValue.length === 0) {
            setProfilesFromService({});
            return;
        }

        setIsLoading(true);

        // Results is the list of profiles from the service
        const results = await getSuggestions({ query: inputValue, type: "profiles", resultSize: 10 });

        setProfilesFromService(results.data.uniqueProfiles);

        setIsLoading(false);
    }, 125);

    const renderIcon = useCallback(() => (
        <SVGContainer>
            <CollabInputSVG />
        </SVGContainer>
    ), []);

    const handleProfileClick = (profile: Profile) => {
        // toggle selected status
        const selectedProfiles = structuredClone(props.collabData.selectedProfiles);
        if(selectedProfiles[profile.userId]) {
            // The array currently has an entry for this profile which means we need
            // to toggle it off (ie remove from map)
            delete selectedProfiles[profile.userId];
        } else {
            // No entry for this profile which means we need to add it
            selectedProfiles[profile.userId] = profile;
        }

        props.onCollabChanged({selectedProfiles});
    }

    const handleDoneButton = () => {
        // Now we need to close the popup
        dropdownRef.current?.close();

        const text = buildCollabSearchText(props.collabData.selectedProfiles);

        setSearchText(text);
        setProfilesFromService({});
    }

    const renderProfile = (profile: Profile) => {
        const isChecked = !!props.collabData?.selectedProfiles[profile?.userId];
        
        if(isChecked) {
            return null;
        }

        return (
            <ProfileLinkWrapper key={`${profile.userId}_unselected`} onClick={() => handleProfileClick(profile)}>
                <ProfileLink
                    collaborators={{}}
                    showCollaborators={false}                
                    pfp={profile.pfp}
                    showUserName={true}
                    showPfp={true}
                    showFullName={true}
                    showLocation={false}
                    userName={profile.userName}
                    fullName={`${profile.firstName} ${profile.lastName}`.trim()}
                    onClick={()=>true}
                    url={null} />
                <Checkbox name={profile.userName} isChecked={isChecked} onSelect={() => handleProfileClick(profile)}></Checkbox>                
            </ProfileLinkWrapper>
        )
    }

    const renderSelected = () => {
        if(isLoading) {
            return null;
        }

        const selectedProfiles = Object.values(props.collabData.selectedProfiles);

        if(selectedProfiles.length === 0) {
            return null;
        }

        const nodes = [];
        
        for(const profile of selectedProfiles) {
            nodes.push(
                <ProfileLinkWrapper key={`${profile.userId}_selected`} onClick={() => handleProfileClick(profile)}>
                    <ProfileLink
                        collaborators={{}}
                        showCollaborators={false}
                        pfp={profile.pfp}
                        showUserName={true}
                        showPfp={true}
                        showFullName={true}
                        showLocation={false}
                        userName={profile.userName}
                        fullName={`${profile.firstName} ${profile.lastName}`.trim()}
                        onClick={()=>true}
                        url={null} />
                    <Checkbox name={profile.userName} isChecked={true} onSelect={() => handleProfileClick(profile)}></Checkbox>                
                </ProfileLinkWrapper>);
        }

        nodes.push(<Divider key="divider" />);

        return nodes;
    }

    const shouldRenderInitial = () => {
        if(isLoading) {
            return false;
        }

        const profileFromServiceSize = Object.keys(profilesFromService).length;

        if((searchText && searchText.length > 0) || profileFromServiceSize > 0) {
            return false;
        }


        if(Object.keys(props.collabData.selectedProfiles).length > 0 || profileFromServiceSize > 0) {
            return false;
        }

        return true;
    }

    const renderInitial = () => {
        if(!shouldRenderInitial()) {
            return null;
        }

        return (
            <Div>
                <PopupSVGContainer>
                    <Div>
                        <CollabInputSVG />
                    </Div>
                </PopupSVGContainer>
                <CollaboratorHeading>
                    Add Collaborators
                </CollaboratorHeading>
                <CollaboratorSubHeading>
                    Their username will be added to the post.
                </CollaboratorSubHeading>
            </Div>            
        )
    }

    return (
        <PopupDropdownSelector
            ref={dropdownRef}
            value={searchText}
            placeholder="Add Collaborators"
            inputIcon={renderIcon()}
            isInputBox={true}
            isMultiSelect={true}
            hideArrow={true}
            hideBorder={true}
            selectedItems={[]}
            onClose={() => { }}
            onSelect={()=> {}}
            onChange={throttledCollabTextChange}
            onInputClick={() => setSearchText("")}>
            {(isOpen: boolean) => (
                <CollabPopupContainer $isOpen={isOpen}>
                    <FlexColumn $padding="10px" $width="100%" $margin="auto">
                        {renderInitial()}
                        <LoadingImage isLoading={isLoading} />
                        {renderSelected()}
                        {!isLoading && Object.values(profilesFromService).map((profile: Profile) => renderProfile(profile))} 
                        {!shouldRenderInitial() && 
                            <DoneButtonWrapper>
                                <DoneButton type="button" text="Done" onClick={handleDoneButton}/>                                    
                            </DoneButtonWrapper>                                 
                        }                                           
                    </FlexColumn>
                </CollabPopupContainer>
            )}
        </PopupDropdownSelector>
    )
}

export default CollabPopup;