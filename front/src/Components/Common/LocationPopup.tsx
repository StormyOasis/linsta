import React, { SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { Div, FlexColumn, Span } from "./CombinedStyling";
import { getLocation } from "../../api/ServiceController";
import useThrottle from '../../utils/useThrottle';
import { CircleXSVG, LocationSVG } from './Icon';

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
    top: 36px;
    width: 20%;
    height: 40%;
    z-index: 9;
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
    overflow-y: auto;
    overflow-x: clip;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        width: 100vw;
        height: auto;
    }         
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
    
    // Refs to detect outside click
    const inputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                popupRef.current &&
                !popupRef.current.contains(target) &&
                inputRef.current &&
                !inputRef.current.contains(target)
            ) {
                setIsLocationOpen(false);
            }
        };

        if (isLocationOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isLocationOpen]);

    const handleLocationInputBoxClick = useCallback(() => {
        setIsLocationOpen(true);
    }, []);

    const handleLocationKeyUp = useCallback((e:React.KeyboardEvent<HTMLDivElement>) => {        
        if(e.key === "Escape") { // On escape key press, close the picker            
            setIsLocationOpen(false);
            return;
        }
    }, [isLocationOpen]);

    const handleLocationClear = useCallback((e:React.SyntheticEvent) => {
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
    }, 75);
    
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
                ref={inputRef}
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
                    <CircleXSVG width="16px" height="16px" fill="currentColor" stroke="none" style={{ cursor: "pointer" }} onClick={handleLocationClear} /> :
                    <LocationSVG strokeWidth={0} width="23px" height="23px" stroke="currentColor" fill="none" />
                }
            </SVGContainer>
            <LocationPopupContainer ref={popupRef} $isOpen={isLocationOpen}  data-testid="location-popup-container">
                <FlexColumn>
                    {renderLocationEntries()}
                </FlexColumn>
            </LocationPopupContainer>
        </Label>
    );
}

export default LocationPopup;