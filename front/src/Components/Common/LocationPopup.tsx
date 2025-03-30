import React, { SyntheticEvent, useCallback, useState } from 'react';
import styled from 'styled-components';

import LocationSVG from "/public/images/location.svg";
import CircleXSVG from "/public/images/x-circle.svg";
import { Div, FlexColumn, Span } from "./CombinedStyling";
import { getLocation } from "../../api/ServiceController";
import useThrottle from '../../utils/useThrottle';

const SVGContainer = styled(Div)`
    width: 24px;
    height: 24px;
    margin: auto;
    align-content: center;
`;

const Label = styled.label`
    display: flex;
    flex-direction: row;
    align-content: center;
`;

const Input = styled.input`
    width: 100%;
    height: 30px;
    border: none;
    font-size: 1.05em;

    &:focus {
        outline: none;
    }
`;

const LocationPopupContainer = styled(Div)<{$isOpen: boolean}>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    position: fixed;
    top: 10px;
    width: 20%;
    height: 50%;
    z-index: 9;
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
    overflow-y: auto;
    overflow-x: clip;
`;

const LocationEntry = styled(Div)`
    padding: 8px;
    width: 100%;
    max-height: 36px;
    cursor: pointer;

    &:hover {
        background-color: ${props => props.theme['colors'].borderDefaultColor};
    }; 
`;

type LocationProps = {
    locationText?: string|undefined;  
    onLocationChanged: (value: string) => void;
}

type LocationData = {
    Place: { Label: string };
    Relevance: number;
};


const LocationPopup: React.FC<LocationProps> = (props: LocationProps) => {
    const [isLocationOpen, setIsLocationOpen] = useState<boolean>(false);
    const [locationData, setLocationData] = useState<LocationData[]>([]);
    
    const handleLocationInputBoxClick = useCallback(() => {
        setIsLocationOpen(true);
    }, []);

    const handleLocationKeyUp = useCallback((e:React.KeyboardEvent<HTMLDivElement>) => {        
        if(e.key === "Escape") { // On escape key press, close the picker            
            setIsLocationOpen(false);
            return;
        }
    }, []);

    const handleLocationClear = useCallback((e:React.SyntheticEvent<HTMLInputElement>) => {
        e.stopPropagation();
        e.preventDefault();

        setIsLocationOpen(false);
        setLocationData([]);
        
        props.onLocationChanged("");
    }, [props.onLocationChanged]);

    const throttledLocationTextChange = useThrottle(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.currentTarget.value.trim();

        if (inputValue.length === 0) {
            props.onLocationChanged("");
            setLocationData([]);
            return;
        }

        props.onLocationChanged(inputValue);
        const result = await getLocation(inputValue);
        setLocationData(result.data);
    }, 150);
    
    const handleSelectLocationClick = useCallback((event: SyntheticEvent, label: string) => {        
        event.stopPropagation();
        event.preventDefault();

        setIsLocationOpen(false);
        setLocationData([]);

        props.onLocationChanged(label);
    }, [props.onLocationChanged]);       

    const renderLocationEntries = () => {
        if(locationData == null) {
            return <></>;
        }

        return locationData.map((entry:LocationData, index: number) => (
            <LocationEntry key={index} 
                onClick={(e: React.SyntheticEvent<Element, Event>) => handleSelectLocationClick(e, entry.Place.Label)}>
                <Span>{entry.Place.Label}</Span>
            </LocationEntry>                        
        ));
    }    

    return (
        <Label>
            <Input type="text" 
                placeholder="Add Location" 
                spellCheck={true}
                aria-label="Add Location" 
                aria-placeholder="Add Location"
                name="locationInput" 
                value={props.locationText}
                onClick={handleLocationInputBoxClick}
                onKeyUp={handleLocationKeyUp}
                onChange={throttledLocationTextChange}>
            </Input>
            <SVGContainer>
                {(props.locationText && props.locationText.length > 0) ?
                    <CircleXSVG style={{ cursor: "pointer" }} onClick={handleLocationClear} /> :
                    <LocationSVG />
                }
            </SVGContainer>
            <LocationPopupContainer $isOpen={isLocationOpen}>
                <FlexColumn>
                    {renderLocationEntries()}
                </FlexColumn>
            </LocationPopupContainer>
        </Label>
    );
}

export default LocationPopup;