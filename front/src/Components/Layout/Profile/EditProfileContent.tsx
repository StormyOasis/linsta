import React from "react";
import { useEffect, useState } from "react";
import { Profile } from "../../../api/types";
import { actions, useAppDispatch, useAppSelector } from "../../../Components/Redux/redux";
import { AuthUser } from "../../../api/Auth";
import { ContentWrapper, Div, Flex, FlexColumn, FlexRow, Main, Section, Span } from "../../../Components/Common/CombinedStyling";
import styled from "styled-components";
import ProfileLink from "../../../Components/Common/ProfileLink";
import StyledButton from "../../../Components/Common/StyledButton";
import { HOST } from "../../../api/config";
import { MODAL_TYPES } from "../../../Components/Redux/slices/modals.slice";
import StyledInput from "../../../Components/Common/StyledInput";
import { splitFullName, validateFullName, validateUrl } from "../../../utils/utils";
import TextEditor from "../../../Components/Common/Lexical/TextEditor";
import EmojiPickerPopup from "../../../Components/Common/EmojiPickerPopup";
import PopupDropdownSelector, { CustomTextOption, TextOption } from "../../Common/PopupDropdownSelector";
import { getProfileByUserId } from "../../../Components/Redux/slices/profile.slice";
import { postUpdateProfileByUserId } from "../../../api/ServiceController";
import { useNavigate } from 'react-router-dom';

const MAX_BIO_LENGTH = 255;
const MAX_CUSTOM_LENGTH = 64;

const TextEditorContainerWrapper = styled(Div)`
    min-height: ${props => props.theme['sizes'].minPostTextEditorHeight};
    max-height: ${props => props.theme['sizes'].maxPostTextEditorHeight};
    position: relative;
    align-items: stretch;
    justify-content: flex-start;
    overflow: hidden;
    border: 2px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
`;

const TextEditorContainer = styled(Div)`
    align-items: center;
    position: relative;
    width: 100%;  
`;

const TextEditorBottomWrapper = styled(Flex)`
    align-items: center;
    justify-content: space-between;
    padding-left: 10px;
    padding-right: 10px;
`;

const CharacterCountContainer = styled(Div)`
    color: ${props => props.theme['colors'].mediumTextColor};
    font-size: .9em;
`;

const PageHeader = styled.h1`
    font-size: 22px;
    font-weight: 700;
    line-height: 25px;
    margin: 0px;
`;

const ProfilePfpContainer = styled(FlexRow)`
    overflow: hidden;
    justify-content: space-between;
    padding: 15px;
    background-color: ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 16px;
    align-items: center;
`;

const InputContainer = styled(Div)`
    margin-top: 24px;
    padding-left: 15px;
`;

const InputHeader = styled.h2`
    font-size: 18px;
    font-weight: 600;
    line-height: 20px;
`;

const NoticeText = styled(Div)`
    font-size: 12px;
    color: ${props => props.theme['colors'].mediumTextColor};
`;


const EditProfileContent: React.FC = () => {
    const navigate = useNavigate();
    const authUser: AuthUser = useAppSelector((state: any) => state.auth.user);
    const profile: Profile = useAppSelector((state: any) => state.profile.profile);

    //Don't want to init lexical until we have the bio text to pass as an initial value
    const [hasLoaded, setHasLoaded] = useState<boolean>(false);
    const [website, setWebsite] = useState<string>("");
    const [fullName, setFullName] = useState<string>("");
    const [emoji, setEmoji] = useState(null);
    const [charCount, setCharCount] = useState(0);
    const [bioText, setBioText] = useState<string>("");

    const [selectedGenderItem, setSelectedGenderItem] = useState<string>("Prefer not to say");
    const [selectedGenderIndex, setSelectedGenderIndex] = useState<number>(0);
    const [customGenderText, setCustomGenderText] = useState<string>("");

    const [selectedPronounItem, setSelectedPronounItem] = useState<string>("Prefer not to say");
    const [selectedPronounIndex, setSelectedPronounIndex] = useState<number>(0);
    const [customPronounText, setCustomPronounText] = useState<string>("");

    const dispatch = useAppDispatch();

    useEffect(() => {
        // The profile should technically already be in Redux, but it's possible
        // that the version in Redux is not up to date with the server so pull it 
        // down again on page load
        dispatch(getProfileByUserId({ userId: authUser.id })).then(result => {
            const setGenderValues = (genderFromProfile: string | undefined) => {
                // Defaults for the case where nothing is found in the profile
                if (genderFromProfile == null || genderFromProfile.trim().length === 0) {
                    setSelectedGenderIndex(0);
                    setSelectedGenderItem("Prefer not to say");
                    setCustomGenderText("");
                    return;
                }

                // Given a gender string from the profile, find it's corrosponding index
                // in the genderOptions array
                let profileGender: string = genderFromProfile.toLowerCase().trim();

                let foundGender: boolean = false;
                genderOptions.forEach((entry, index: number) => {
                    const genderText = entry.text.toLowerCase().trim();
                    if (genderText === profileGender) {
                        setSelectedGenderIndex(index);
                        setSelectedGenderItem(genderFromProfile.trim());
                        foundGender = true;
                    }
                });

                // If we didn't find the gender text in the array means the
                // user has entered a custom gender
                if (!foundGender) {
                    profileGender = genderFromProfile.trim();
                    setSelectedGenderIndex(3);
                    setSelectedGenderItem(profileGender);
                    setCustomGenderText(profileGender);
                }
            }

            const setPronounValues = (pronounsFromProfile: string | undefined) => {
                // Defaults for the case where nothing is found in the profile              
                if (pronounsFromProfile == null || pronounsFromProfile.trim().length === 0) {
                    setSelectedPronounIndex(0);
                    setSelectedPronounItem("Prefer not to say");
                    setCustomPronounText("");
                    return;
                }

                // Given a pronoun string from the profile, find it's corrosponding index
                // in the pronounOptions array
                let profilePronoun: string = pronounsFromProfile.toLowerCase().trim();

                let foundPronouns: boolean = false;
                pronounOptions.forEach((entry, index: number) => {
                    const pronounText = entry.text.toLowerCase().trim();
                    if (pronounText === profilePronoun) {
                        setSelectedPronounIndex(index);
                        setSelectedPronounItem(pronounsFromProfile.trim());
                        foundPronouns = true;
                    }
                });

                // If we didn't find the pronoun text in the array means the
                // user has entered custom pronouns
                if (!foundPronouns) {
                    profilePronoun = pronounsFromProfile.trim();
                    setSelectedPronounIndex(4);
                    setSelectedPronounItem(profilePronoun);
                    setCustomPronounText(profilePronoun);
                }
            }

            const profile: Profile = (result.payload as any).data as Profile;

            setWebsite(profile.link || "");
            setFullName(profile.firstName + " " + profile.lastName);
            setBioText(profile.bio || "");
            setGenderValues(profile.gender);
            setPronounValues(profile.pronouns);

            setHasLoaded(true); //Lexical can start now
        });
    }, []);

    const handlePfpClick = () => {
        // Open the upload profile pic dialog by setting the state in redux        
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.PROFILE_PIC_MODAL, data: {profile} }));
    }

    const handleEmojiSelect = (emoji: any) => {
        // If the user selects the same emoji twice(or more) in a row
        // then the editor won't detect a change, so it won't print 
        // the second emoji. Use a nonce to force the text editor's plugin's
        // useEffect() to detect the change and rerun
        emoji.nonce = crypto.randomUUID();
        setEmoji(emoji);
    }

    const getCurrentLength = (count: number, _delCount: number): void => {
        setCharCount(count);
    }

    const handleLexicalChange = (data: string) => {
        if (charCount === 0) {
            setBioText("");
        } else {
            setBioText(data);
        }
    }

    const handleItemSelect = (index: number, value: string, dropdownId: number) => {
        if (dropdownId === 0) {
            // Change happened on the gender dropdown
            setSelectedGenderItem(value);
            setSelectedGenderIndex(index);
            if (index === 3) {
                // Custom text
                setCustomGenderText(value);
            } else {
                setCustomGenderText("");
            }
        } else if (dropdownId === 1) {
            // Change happened on pronoun dropdown
            setSelectedPronounItem(value);
            setSelectedPronounIndex(index);
            if (index === 4) {
                // Custom text
                setCustomPronounText(value);
            } else {
                setCustomPronounText("");
            }
        }
    };

    const handleSubmit = async () => {
        const { firstName, middleNames, lastName } = splitFullName(fullName);
        const gender = customGenderText.length > 0 ? customGenderText : selectedGenderItem;
        const pronouns = customPronounText.length > 0 ? customPronounText : selectedPronounItem;

        const data: any = {
            link: website,
            firstName: `${firstName} ${middleNames}`.trim(), //in case there isn't a middle name
            lastName: lastName,
            bio: bioText,
            gender: gender,
            pronouns: pronouns,
            pfp: profile.pfp,
            userId: authUser.id
        };

        const results = await postUpdateProfileByUserId(data);
        if (results.status === 200) {
            navigate(`/${profile.userName}`);
        }
    }

    const genderOptions = [
        {
            text: "Prefer not to say",
            element: <TextOption text="Prefer not to say" key="0_0"
                dropdownId={0} index={0} isChecked={selectedGenderIndex === 0} onChange={handleItemSelect} />
        },
        {
            text: "Male",
            element: <TextOption text="Male" key="0_1"
                dropdownId={0} index={1} isChecked={selectedGenderIndex === 1} onChange={handleItemSelect} />
        },
        {
            text: "Female",
            element: <TextOption text="Female" key="0_2"
                dropdownId={0} index={2} isChecked={selectedGenderIndex === 2} onChange={handleItemSelect} />
        },
        {
            text: "Custom",
            element: <CustomTextOption key="0_3"
                maxLength={MAX_CUSTOM_LENGTH} dropdownId={0} index={3}
                text={customGenderText} isChecked={selectedGenderIndex === 3} onChange={handleItemSelect} />
        }
    ];

    const pronounOptions = [
        {
            text: "Prefer not to say",
            element: <TextOption text="Prefer not to say" key="1_0"
                dropdownId={1} index={0} isChecked={selectedPronounIndex === 0} onChange={handleItemSelect} />
        },
        {
            text: "She / Her",
            element: <TextOption text="She / Her" key="1_1"
                dropdownId={1} index={1} isChecked={selectedPronounIndex === 1} onChange={handleItemSelect} />
        },
        {
            text: "He / Him",
            element: <TextOption text="He / Him" key="1_2"
                dropdownId={1} index={2} isChecked={selectedPronounIndex === 2} onChange={handleItemSelect} />
        },
        {
            text: "They / Them",
            element: <TextOption text="They / Them" key="1_3"
                dropdownId={1} index={3} isChecked={selectedPronounIndex === 3} onChange={handleItemSelect} />
        },
        {
            text: "Custom",
            element: <CustomTextOption key="1_4"
                maxLength={MAX_CUSTOM_LENGTH} dropdownId={1} index={4}
                text={customPronounText} isChecked={selectedPronounIndex === 4} onChange={handleItemSelect} />
        }
    ];

    const renderGenderDropdown = () => {
        return (
            <PopupDropdownSelector
                selectedItems={[selectedGenderItem]}
                onClose={() => { }}
                onSelect={handleItemSelect}>
                {() => (
                    <FlexColumn style={{ padding: "10px" }}>
                        {genderOptions.map(entry => entry.element)}
                    </FlexColumn>
                )}
            </PopupDropdownSelector>
        );
    }

    const renderPronounDropdown = () => {
        return (
            <PopupDropdownSelector
                selectedItems={[selectedPronounItem]}
                onClose={() => { }}
                onSelect={handleItemSelect}>
                {() => (
                    <FlexColumn style={{ padding: "10px" }}>
                        {pronounOptions.map(entry => entry.element)}
                    </FlexColumn>
                )}
            </PopupDropdownSelector>
        );
    }

    if (profile == null || !hasLoaded) {
        return <></>;
    }

    return (
        <ContentWrapper $overflow="auto" $maxHeight="100vh">
            <Section>
                <Main role="main" style={{ overflow: "visible", paddingBottom: "128px" }}>
                    <Flex $justifyContent="center">
                        <FlexColumn $width="50%">
                            <Div $marginBottom="10px" style={{ padding: "15px" }}>
                                <PageHeader>Edit Profile</PageHeader>
                            </Div>
                            <ProfilePfpContainer>
                                <Div>
                                    <ProfileLink 
                                        collaborators={[]}
                                        showCollaborators={true}                                    
                                        pfpWidth="64px" 
                                        showPfp={true} 
                                        showUserName={true} 
                                        showFullName={true}
                                        showLocation={false}
                                        pfp={profile.pfp} 
                                        userName={profile.userName}
                                        fullName={`${profile.firstName} ${profile.lastName}`}
                                        url={`${HOST}/${profile.userName}`} />
                                </Div>
                                <Div>
                                    <StyledButton text={"Change Photo"} onClick={handlePfpClick}>
                                    </StyledButton>
                                </Div>
                            </ProfilePfpContainer>

                            <InputContainer>
                                <InputHeader>Full Name</InputHeader>
                                <StyledInput
                                    validationXpos="24px"
                                    validationYpos="10px"
                                    noMargin={true}
                                    style={{ borderRadius: "10px", height: "32px" }}
                                    name="fullName"
                                    placeholder="Full Name"
                                    value={fullName}
                                    isValid={validateFullName(fullName)}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFullName(event.target.value)}
                                ></StyledInput>
                            </InputContainer>

                            <InputContainer>
                                <InputHeader>Website</InputHeader>
                                <StyledInput
                                    validationYpos="10px"
                                    validationXpos="24px"
                                    noMargin={true}
                                    style={{ borderRadius: "10px", height: "32px" }}
                                    name="website"
                                    placeholder="Website"
                                    value={website}
                                    isValid={validateUrl(website)}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setWebsite(event.target.value)}
                                ></StyledInput>
                            </InputContainer>

                            <InputContainer>
                                <InputHeader>Bio</InputHeader>
                                <TextEditorContainerWrapper>
                                    <TextEditorContainer>
                                        <TextEditor defaultValue={bioText} onChange={handleLexicalChange} 
                                            placeholder="Write a Bio..." maxTextLength={255} emoji={emoji} 
                                            getCurrentLength={getCurrentLength} />
                                    </TextEditorContainer>
                                    <TextEditorBottomWrapper>
                                        <Span $flexBasis="75%">
                                            <EmojiPickerPopup onEmojiClick={handleEmojiSelect} />
                                        </Span>
                                        <CharacterCountContainer>
                                            {charCount > (MAX_BIO_LENGTH + 1) ?
                                                `${(MAX_BIO_LENGTH + 1)} / ${MAX_BIO_LENGTH + 1}` :
                                                `${charCount} / ${MAX_BIO_LENGTH + 1}`}
                                        </CharacterCountContainer>
                                    </TextEditorBottomWrapper>
                                </TextEditorContainerWrapper>
                            </InputContainer>

                            <InputContainer>
                                <InputHeader>Gender</InputHeader>
                                {renderGenderDropdown()}
                            </InputContainer>


                            <InputContainer>
                                <InputHeader>Pronouns</InputHeader>
                                {renderPronounDropdown()}
                            </InputContainer>

                            <InputContainer>
                                <NoticeText>Certain profile info, like your name, bio and links, is visible to everyone</NoticeText>
                            </InputContainer>
                            <Div $marginTop="48px" $paddingLeft="15px" $alignSelf="end">
                                <Div>
                                    <StyledButton text="Submit" onClick={handleSubmit}></StyledButton>
                                </Div>
                            </Div>
                        </FlexColumn>
                    </Flex>
                </Main>
            </Section>
        </ContentWrapper>
    );
}

export default EditProfileContent;