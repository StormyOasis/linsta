import React from 'react';
import parse, {
    DOMNode,
    domToReact,
    Element,
    Text as HtmlTextNode,
} from 'html-react-parser';
import StyledLink from './StyledLink';


const parseStyleString = (styleString: string): React.CSSProperties => {
    return styleString.split(';').reduce((styleObj, declaration) => {
        const [property, value] = declaration.split(':').map(s => s.trim());
        if (property && value) {
            const camelCaseProp = property.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
            (styleObj as any)[camelCaseProp] = value;
        }
        return styleObj;
    }, {} as React.CSSProperties);
}

type LinkifyProps = {
    html: string;
    onClick?: (e:React.MouseEvent) => void;
}

const Linkify: React.FC<LinkifyProps> = (props: LinkifyProps) => {
    const linkifyText = (text: string): React.ReactElement[] => {
        const regex = /(@[a-zA-Z0-9._]+|#[a-zA-Z0-9_]+)/g;
        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                return (
                    <StyledLink key={index} to={`/${username}`} onClick={props.onClick}>
                        {part}
                    </StyledLink>
                );
            } else if (part.startsWith('#')) {
                return (
                    <StyledLink key={index} to={`/explore?q=${encodeURIComponent(part)}`} onClick={props.onClick}>
                        {part}
                    </StyledLink>
                );
            } else {
                return <React.Fragment key={index}>{part}</React.Fragment>;
            }
        });
    };

    const transform = (
        node: DOMNode,
        index: number
    ): string | boolean | void | React.ReactElement | null => {
        if (node.type === 'text') {
            const textNode = node as HtmlTextNode;
            return <React.Fragment key={index}>{linkifyText(textNode.data)}</React.Fragment>;
        }

        if (node.type === 'tag') {
            const element = node as Element;
            const { attribs, name, children } = element;

            const props: { [key: string]: any } = { ...attribs };

            // Convert class to className
            if ('class' in props) {
                props['className'] = props['class'];
                delete props['class'];
            }

            // Convert style string to React style object
            if ('style' in props) {
                props['style'] = parseStyleString(props['style']);
            }

            return React.createElement(
                name,
                { ...props, key: index },
                domToReact(children as DOMNode[], { replace: transform })
            );
        }

        return null;
    };

    return <>{parse(props.html, { replace: transform })}</>;
};

export default Linkify;
