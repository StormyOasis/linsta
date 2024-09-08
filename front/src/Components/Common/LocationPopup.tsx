import React, { SyntheticEvent, useState } from 'react';
import styled from 'styled-components';

import LocationSVG from "/public/images/location.svg";
import CircleXSVG from "/public/images/x-circle.svg";
import { FlexColumn } from "./CombinedStyling";
import { getLocation } from "../../api/ServiceController";

const SVGContainer = styled.div`
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

const LocationPopupContainer = styled.div<{$isOpen: boolean}>`
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

const LocationEntry = styled.div`
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

const LocationPopup: React.FC<LocationProps> = (props: LocationProps) => {
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [locationData, setLocationData] = useState<{Place: any, Relevance: number}[]>([]);
    
    const handleLocationInputBoxClick = () => {
        setIsLocationOpen(true);
    }

    const handleLocationKeyUp = (e:React.KeyboardEvent<HTMLDivElement>) => {        
        if(e.key === "Escape") { // On escape key press, close the picker            
            setIsLocationOpen(false);
            return;
        }
    }

    const handleLocationClear = (e:React.SyntheticEvent<HTMLInputElement>) => {
        e.stopPropagation();
        e.preventDefault();

        setIsLocationOpen(false);
        setLocationData([]);
        
        props.onLocationChanged("");
    }
    
    const handleLocationTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {                
        if(e.currentTarget.value === null || e.currentTarget.value.length === 0) {            
            props.onLocationChanged("");
            setLocationData([]);
            return;
        }

        props.onLocationChanged(e.currentTarget.value);

        const result = await getLocation(e.currentTarget.value);
        
        setLocationData(result.data);        
    }
    
    const handleSelectLocationClick = (event: SyntheticEvent, label: string) => {        
        event.stopPropagation();
        event.preventDefault();

        setIsLocationOpen(false);
        setLocationData([]);

        props.onLocationChanged(label);
    }       

    const renderLocationEntries = () => {
        if(locationData == null) {
            return <></>;
        }
        const entries:any[] = [];

        locationData.map(entry => {
            entries.push(
                <LocationEntry key={entries.length} onClick={(e) => handleSelectLocationClick(e, entry.Place.Label)}>
                    <span>
                        {entry.Place.Label}
                    </span>
                </LocationEntry>                        
            );
        });

        return entries;
    }    

    return (
        <Label>
            <Input type="text" placeholder="Add Location" spellCheck={true}
                aria-label="Add Location" aria-placeholder="Add Location"
                name="locationInput" value={props.locationText}
                onClick={handleLocationInputBoxClick}
                onKeyUp={handleLocationKeyUp}
                onChange={handleLocationTextChange}>
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