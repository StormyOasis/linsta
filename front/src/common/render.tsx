import React from 'react';
import { Store } from "./state/store";

export default function Html(props:any) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="shortcut icon" href="favicon.ico" />
          <title>{props.title}</title>
        </head>
        <body>
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<b>Enable JavaScript to run this app.</b>`
            }}
          />
          {props.children}
          <script
            dangerouslySetInnerHTML={{
              __html: `initialState = ${JSON.stringify(props.initialState)}`
            }}
          />
        </body>
      </html>
    );
  }