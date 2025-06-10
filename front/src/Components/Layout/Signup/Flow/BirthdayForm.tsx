import React from "react";
import { styled } from "styled-components";

import StyledButton from "../../../../Components/Common/StyledButton";
import { FlexColumn, Span, Div } from "../../../../Components/Common/CombinedStyling";
import { MODAL_TYPES } from "../../../Redux/slices/modals.slice";
import { actions, useAppDispatch } from "../../../Redux/redux";

const FormWrapper = styled(FlexColumn)`
    align-content: stretch;
    align-items: center;
    justify-content: flex-start;     
    overflow: visible;
    position: relative;
`;

const MainFormWrapper = styled(FormWrapper)`
    maxWidth: 350px;
    padding: 8px 28px;
`;

const BirthdayImage = styled(Span)`
    background-image: url('/public/images/birthday_cake.png');
    display: block; 
    height: 96px; 
    width: 141px;
`;

const Section = styled(FlexColumn)`
    align-content: stretch;
    align-items: stretch;
    justify-content: flex-start;
    overflow: visible;
    position: relative;
`;

const Text = styled(Span)`    
    display: block;
    overflow-wrap: break-word;
    overflow: visible;
    text-align: center;
    text-wrap: wrap;
`;

const Text2 = styled(Div)`
    color: ${props => props.theme['colors'].inputTextColor};
    font-size: 12px;
    line-height: 16px;
    text-align: center;
`;

const Text3 = styled(Span)`
    font-size: 12px;
    line-height: 16px;
    text-align: center;
    word-break: break-word;
    text-wrap: wrap;
    position: relative;
    overflow: visible;
    overflow-wrap: break-word;
    color: ${props => props.theme['colors'].inputTextColor};
`;

const InputWrapper = styled(Span)`
    display: inline-block;
    position: relative;
    vertical-align: baseline;
    margin-right: 8px;
`;

const InputSelect = styled.select`
    border-color: ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 3px;
    align-items: center;
    color: ${props => props.theme['colors'].inputTextColor};
    font-size: 12px;
    height: 36px;
    overflow: visible;
    padding: 0 8px 0 8px;
    text-align: start; 
    text-wrap: nowrap;
`;

const TextButton = styled.button`
    background-color: ${props => props.theme['colors'].backgroundColor};
    color: ${props => props.theme['colors'].buttonDefaultColor};
    cursor: pointer;
    align-items: flex-start;
    position: relative;
    text-align: center;
    font-weight: 500;
    border: none;
    display: block;
    overflow-wrap: break-word;
    overflow: visible;
    text-align: center;
    text-wrap: wrap;
`;

const BackButton = styled.button`
    background-color: ${props => props.theme['colors'].backgroundColor};
    color: ${props => props.theme['colors'].buttonDefaultColor};
    cursor: pointer;
    align-items: flex-start;
    position: relative;
    text-align: center;
    font-weight: 600;
    border: none;
    display: block;
    overflow-wrap: break-word;
    overflow: visible;
    text-wrap: wrap;
`;

export type BirthdayFormProps = {
    month: number;
    day: number;
    year: number;
    date_valid: boolean;
    showBirthdayModal: boolean;
    changePage: any;
    changeState: any;
    handleFormChange: any;
}

const BirthdayForm: React.FC<BirthdayFormProps> = (props: BirthdayFormProps) => {
    const dispatch = useAppDispatch();

    const displayBirthdayModal = () => {
        dispatch(actions.modalActions.openModal({
            modalName: MODAL_TYPES.SIGNUP_BIRTHDAY_MODAL,
            data: { }
        }));
    }

    const changeBirthDate = (event: React.ChangeEvent<HTMLSelectElement>) => {
        event.preventDefault();

        let dateValid = props.date_valid;
        const currentYear = new Date().getFullYear();

        if (event.target.name == 'year') {
            dateValid = (currentYear - Number(event.target.value) >= 5);
        }

        props.handleFormChange(event.target.name, Number.parseInt(event.target.value), dateValid);
    }

    const renderBirthYears = () => {
        let currentYear = new Date().getFullYear();
        let years = [];
        for (let i = 0; i < 120; i++) {
            const year = (currentYear - i).toString();
            years.push(<option key={year} title={year} value={year}>{year}</option>);
        }

        return years;
    }

    const renderBirthDaysByMonth = () => {
        let days = [];
        const numDaysInMonth = new Date(props.year, props.month, 0).getDate();
        for (let i = 1; i <= numDaysInMonth; i++) {
            days.push(<option key={i} title={i.toString()} value={i}>{i}</option>);
        }

        return days;
    }

    return (
        <MainFormWrapper>
            <BirthdayImage />
            <Section $marginTop="16px">
                <Text $fontWeight="600">Add Your Birthday</Text>
            </Section>
            <Section $marginTop="16px">
                <Text>This won't be a part of your public profile.</Text>
            </Section>
            <Section>
                <TextButton onClick={displayBirthdayModal}>
                    Why do I need to provide my birthday?
                </TextButton>
            </Section>
            <Section $marginTop="12px">
                <Div>
                    <FormWrapper>
                        <Span>
                            <InputWrapper>
                                <InputSelect title="Month" name="month"
                                    value={props.month} onChange={changeBirthDate}>
                                    <option title="January" value="1">January</option>
                                    <option title="February" value="2">February</option>
                                    <option title="March" value="3">March</option>
                                    <option title="April" value="4">April</option>
                                    <option title="May" value="5">May</option>
                                    <option title="June" value="6">June</option>
                                    <option title="July" value="7">July</option>
                                    <option title="August" value="8">August</option>
                                    <option title="September" value="9">September</option>
                                    <option title="October" value="10">October</option>
                                    <option title="November" value="11">November</option>
                                    <option title="December" value="12">December</option>
                                </InputSelect>
                            </InputWrapper>
                            <InputWrapper>
                                <InputSelect title="Day" name="day"
                                    value={props.day} onChange={changeBirthDate}>
                                    {renderBirthDaysByMonth()}
                                </InputSelect>
                            </InputWrapper>
                            <InputWrapper>
                                <InputSelect title="Year" name="year"
                                    value={props.year} onChange={changeBirthDate}>
                                    {renderBirthYears()}
                                </InputSelect>
                            </InputWrapper>
                        </Span>
                        <Section $marginTop="4px" $marginBottom="8px">
                            <Text2>
                                You need to enter the date you were born
                            </Text2>
                        </Section>
                    </FormWrapper>
                </Div>
            </Section>
            <Section>
                <Section $marginTop="8px" $marginBottom="8px">
                    <Text3>
                        Use your own birthday, even if this account is for a business, a pet, or something else
                    </Text3>
                </Section>
            </Section>
            <Section $width="100%" style={{padding: "16px 8px 16px 8px" }}>
                <StyledButton datatestid="submit-signupbday" type="button" text="Next" disabled={!props.date_valid}
                    style={{ margin: 0 }} onClick={() => { props.changePage(1) }}>
                </StyledButton>
            </Section>
            <Section>
                <BackButton onClick={() => props.changePage(-1)}>Go Back</BackButton>
            </Section>
        </MainFormWrapper>
    )
}

export default BirthdayForm;