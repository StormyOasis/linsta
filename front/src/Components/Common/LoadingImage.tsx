import React from 'react';
import { Div } from './CombinedStyling';

type LoadingImageProps = {
    isLoading: boolean;
};

const LoadingImage: React.FC<LoadingImageProps> = (props: LoadingImageProps) => {

    if(!props.isLoading) {
        return null;
    }

    return (
        <Div $alignSelf="center">
            <img src="/public/images/loading.gif" alt="Loading..." aria-label="Loading Image"/>
        </Div>        
    );
};

export default LoadingImage;