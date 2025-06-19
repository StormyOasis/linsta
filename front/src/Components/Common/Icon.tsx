import React from 'react';
import { SPRITE_PATH } from '../../api/config';
import { styled } from 'styled-components';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;    
}

export const Icon: React.FC<IconProps> = (props: IconProps) => {
    return (
        <svg
            className={props.className}
            width={props.width || undefined}
            height={props.height || undefined}
            fill={props.fill || 'none'}
            stroke={props.stroke || 'currentColor'}
            strokeWidth={props.strokeWidth || 2}            
            aria-hidden="true"
            focusable="false"
            {...props}>
            <use href={`${SPRITE_PATH}#${props.name}`} />
        </svg>
    );
};

export function makeStyledIcon(fixedName: string) {
    return styled((props: Omit<IconProps, 'name'>) => (
        <Icon {...props} name={fixedName} />
    ))`
  `;
}

export const SearchSVG = makeStyledIcon('search-icon');
export const SearchBoxSVG = makeStyledIcon('search');
export const CircleXSVG = makeStyledIcon('x-circle');
export const CheckCircleSVG = makeStyledIcon('check-circle');
export const HeartSVG = makeStyledIcon('heart');
export const HeartFilledSVG = makeStyledIcon('heart-fill');
export const CollabInputSVG = makeStyledIcon('collaboration');
export const LocationSVG = makeStyledIcon('location');
export const CreateSVG = makeStyledIcon('create');
export const HomeSVG = makeStyledIcon('home');
export const ExploreSVG = makeStyledIcon('explore');
export const MainSVG = makeStyledIcon('main');
export const BackArrowSVG = makeStyledIcon('backarrow');
export const LeftArrowSVG = makeStyledIcon('left_arrow');
export const RightArrowSVG = makeStyledIcon('right_arrow');
export const CheckSVG = makeStyledIcon('check');
export const UpSVG = makeStyledIcon('up-line');
export const DownSVG = makeStyledIcon('down-line');
export const XSVG = makeStyledIcon('x');
export const HashtagSVG = makeStyledIcon('hashtag');
export const LogoSVG = makeStyledIcon('linsta_small');
export const LinstaSVG = makeStyledIcon('linsta');
export const MessageSVG = makeStyledIcon('message');
export const ShareSVG = makeStyledIcon('send');
export const CropSVG = makeStyledIcon('crop');
export const OneToOneSVG = makeStyledIcon('1to1');
export const FourToFiveSVG = makeStyledIcon('4to5');
export const SixteenToNineSVG = makeStyledIcon('16to9');
export const ImageSVG = makeStyledIcon('image');
export const MediaSVG = makeStyledIcon('media');
export const WarningSVG = makeStyledIcon('warning');
export const ForgotSVG = makeStyledIcon('forgot');
export const EmailSVG = makeStyledIcon('email');
export const DefaultPFPSVG = makeStyledIcon('profile-user-default');



