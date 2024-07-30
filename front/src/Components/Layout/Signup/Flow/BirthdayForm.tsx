import React from "react";
import { styled } from "styled-components";

import Theme from "../../../../Components/Themes/Theme";
import SignupButton from "../Common/SignupButton";
import Modal from "../../../../Components/Common/Modal";

const FormWrapper = styled.div`
    align-content: stretch;
    align-items: center;
    display: flex; 
    flex-direction: column;
    justify-content: flex-start;     
    overflow: visible;
    position: relative;
`;

const MainFormWrapper = styled(FormWrapper)`
    maxWidth: 350px;
    padding: 8px 28px;
`;

const BirthdayImage = styled.span`
    background-image: url('/public/images/birthday_cake.png');
    display: block; 
    height: 96px; 
    width: 141px;
`;

const Section = styled.div`
    align-content: stretch;
    align-items: stretch;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: visible;
    position: relative;
`;

const Text = styled.span`    
    display: block;
    overflow-wrap: break-word;
    overflow: visible;
    text-align: center;
    text-wrap: wrap;
`;

const Text2 = styled.div`
    color: ${props => props.theme['colors'].inputTextColor};
    font-size: 12px;
    display: block;
    line-height: 16px;
    text-align: center;
`;

const Text3 = styled.span`
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

const InputWrapper = styled.span`
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

const ModalContentWrapper = styled.div`
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

const ModalSectionWrapper = styled.div`
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

type BirthdayFormProps = {
    month: number;
    day: number;
    year: number;
    date_valid: boolean;
    showBirthdayModal: boolean;
    changePage: any;
    changeState: any;
    handleFormChange: any;
}

export default class BirthdayForm extends React.Component<BirthdayFormProps> {

    displayBirthdayModal = () => {
        this.props.changeState("showBirthdayModal", !this.props.showBirthdayModal);
    }

    renderBirthdayModal = () => {
        if (!this.props.showBirthdayModal) {
            return null;
        }

        const cont = document.getElementById("modalContainer");
        const sectionCont = document.getElementById("mainSectionContainer");
        if (cont && sectionCont) {
            cont.style.height = "100%";
            sectionCont.style.pointerEvents = "none";
        }

        return (
            <Modal title="Birthdays" onClose={() => {
                if (cont && sectionCont) {
                    cont.style.height = "0%";
                    sectionCont.style.pointerEvents = "auto";
                }
                this.props.changeState("showBirthdayModal", false);
            }}>
                {this.renderBirthdayModalContent()}
            </Modal>
        );
    }

    changeBirthDate = (event: React.ChangeEvent<HTMLSelectElement>) => {
        event.preventDefault();

        let dateValid = this.props.date_valid;
        const currentYear = new Date().getFullYear();

        if (event.target.name == 'year') {
            dateValid = (currentYear - Number(event.target.value) >= 5);
        }

        this.props.handleFormChange(event.target.name, Number.parseInt(event.target.value), dateValid);
    }

    renderBirthYears = () => {
        let currentYear = new Date().getFullYear();
        let years = [];
        for (let i = 0; i < 120; i++) {
            const year = (currentYear - i).toString();
            years.push(<option key={year} title={year} value={year}>{year}</option>);
        }

        return years;
    }

    renderBirthDaysByMonth = () => {
        let days = [];
        const numDaysInMonth = new Date(this.props.year, this.props.month, 0).getDate();
        for (let i = 1; i <= numDaysInMonth; i++) {
            days.push(<option key={i} title={i.toString()} value={i}>{i}</option>);
        }

        return days;
    }

    renderBirthdayModalContent = () => {
        return (
            <>
                <ModalContentWrapper>
                    <ModalSectionWrapper style={{ maxWidth: "350px", padding: "4px" }}>
                        <span style={{
                            backgroundImage: "url('/public/images/birthday_cake.png')",
                            display: "block", height: "96px", width: "141px"
                        }}></span>
                    </ModalSectionWrapper>
                    <ModalSectionWrapper style={{ marginTop: "4px", padding: "8px" }}>
                        <span style={{ display: "block", fontSize: "20px", lineHeight: "25px", 
                            margin: 0, maxWidth: "100%", overflow: "visible", overflowWrap: "break-word", 
                            position: "relative", textWrap: "wrap", wordBreak: "break-word" }}>
                                Birthdays on Linstagram
                        </span>
                    </ModalSectionWrapper>
                    <ModalSectionWrapper style={{ marginTop: "4px", padding: "8px" }}>
                        <span style={{ display: "block", margin: 0, maxWidth: "100%", 
                            overflow: "visible", overflowWrap: "break-word", position: "relative", 
                            textWrap: "wrap", wordBreak: "break-word", textAlign: "center", pointerEvents: "all" }}>
                                Providing your birthday improves the features and ads you see, and helps us keep the Linstagram community safe. You can find your birthday in your personal information account settings.
                        </span>
                    </ModalSectionWrapper>
                </ModalContentWrapper>
            </>
        );
    }    

    override render() {
        return (
            <Theme>
                {this.renderBirthdayModal()}
                <MainFormWrapper>
                    <BirthdayImage />
                    <Section style={{ marginTop: "16px" }}>
                        <Text style={{ fontWeight: 600 }}>Add Your Birthday</Text>
                    </Section>
                    <Section style={{ marginTop: "16px" }}>
                        <Text>This won't be a part of your public profile.</Text>
                    </Section>
                    <Section>
                        <TextButton onClick={this.displayBirthdayModal}>
                            Why do I need to provide my birthday?
                        </TextButton>
                    </Section>
                    <Section style={{ marginTop: "12px" }}>
                        <div>
                            <FormWrapper>
                                <span>
                                    <InputWrapper>
                                        <InputSelect title="Month" name="month"
                                            value={this.props.month} onChange={this.changeBirthDate}>
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
                                            value={this.props.day} onChange={this.changeBirthDate}>
                                            {this.renderBirthDaysByMonth()}
                                        </InputSelect>
                                    </InputWrapper>
                                    <InputWrapper>
                                        <InputSelect title="Year" name="year"
                                            value={this.props.year} onChange={this.changeBirthDate}>
                                            {this.renderBirthYears()}
                                        </InputSelect>
                                    </InputWrapper>
                                </span>
                                <Section style={{ marginTop: "4px", marginBottom: "8px" }}>
                                    <Text2>
                                        You need to enter the date you were born
                                    </Text2>
                                </Section>
                            </FormWrapper>
                        </div>
                    </Section>
                    <Section>
                        <Section style={{ marginBottom: "8px", marginTop: "8px" }}>
                            <Text3>
                                Use your own birthday, even if this account is for a business, a pet, or something else
                            </Text3>
                        </Section>
                    </Section>
                    <Section style={{ width: "100%", padding: "16px 8px 16px 8px" }}>
                        <SignupButton type="button" text="Next" disabled={!this.props.date_valid}
                            style={{ margin: 0 }} onClick={() => { this.props.changePage(1) }}>
                        </SignupButton>
                    </Section>
                    <Section>
                        <BackButton onClick={() => this.props.changePage(-1)}>Go Back</BackButton>
                    </Section>
                </MainFormWrapper>
            </Theme>
        );
    }
}