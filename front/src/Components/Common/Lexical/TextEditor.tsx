import React, { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HashtagNode } from '@lexical/hashtag';
import { CharacterLimitPlugin } from '@lexical/react/LexicalCharacterLimitPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OverflowNode } from '@lexical/overflow';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { AutoLinkNode } from '@lexical/link';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { EmojiNode } from "./Plugins/EmojiNode";
import { LexicalEditorTheme } from "../../../Components/Themes/Theme";
import AutoFocusPlugin from "./Plugins/AutoFocusPlugin";
import InsertEmojiPlugin from "./Plugins/InsertEmojiPlugin";
import EmojiPlugin from "./Plugins/EmojiPlugin";
import MATCHERS from "./Plugins/AutoLinkPluginMatcher";
import { MaxLengthPlugin } from "./Plugins/MaxLengthPlugin";
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $generateHtmlFromNodes } from '@lexical/html';
import { EditorState, LexicalEditor } from "lexical";
import Placeholder from "./Plugins/Placeholder";
import InitialHtmlPlugin from "./Plugins/InitialHtmlPlugin";
import { preloadEmojiData } from './Plugins/findEmoji';
import { ClickToFocusPlugin } from './Plugins/ClickToFocusPlugin';

type TextEditorProps = {
    emoji: any;
    maxTextLength: number,
    getCurrentLength: (count: number, delCount: number) => void,
    onChange: (text: string) => void,
    placeholder?: string | undefined,
    defaultValue?: string | undefined
}

const TextEditor = (props: TextEditorProps) => {
    const initialConfig = {
        editorState: null,
        namespace: 'TextEditorWithEmoji',
        nodes: [EmojiNode, AutoLinkNode, OverflowNode, HashtagNode],
        theme: LexicalEditorTheme,
        onError: (error: Error) => {
            console.error(error);
            throw error;
        },
    };

    useEffect(() => {
        preloadEmojiData().catch(console.error);
    }, []);

    const handleChange = (editorState: EditorState, editor: LexicalEditor) => {
        editorState.read(() => {
            const html = $generateHtmlFromNodes(editor);
            props.onChange(html);
        });
    }

    return (
        <div id="editor-selector-parent">            
            <LexicalComposer initialConfig={initialConfig}>
                <ClickToFocusPlugin>
                    <RichTextPlugin
                        contentEditable={<ContentEditable />}
                        placeholder={<Placeholder placeholder={props.placeholder} />}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <InsertEmojiPlugin emoji={props.emoji} />
                    <EmojiPlugin />
                    <AutoLinkPlugin matchers={MATCHERS} />
                    <HashtagPlugin />
                    <CharacterLimitPlugin charset="UTF-8" maxLength={props.maxTextLength} renderer={(_remainingCharacters) => {
                        return <></>;
                    }} />
                    <MaxLengthPlugin maxLength={props.maxTextLength} getCurrentLength={props.getCurrentLength} />
                    <OnChangePlugin onChange={handleChange} />
                    <InitialHtmlPlugin initialValue={props.defaultValue} />
                    <AutoFocusPlugin />
                </ClickToFocusPlugin>
            </LexicalComposer>
        </div>
    );
}

export default TextEditor;
